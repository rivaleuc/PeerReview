# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

REVIEW_DIMENSIONS = ("novelty", "methodology", "clarity", "reproducibility")


def _coerce_int(value, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def composite_score(scores: dict) -> int:
    """Deterministic composite: round(mean of the 4 dims * 10) -> 0-100."""
    total = sum(int(scores[k]) for k in REVIEW_DIMENSIONS)
    return round((total / 4) * 10)


def normalize_review_verdict(data: dict) -> dict:
    """Clamp each sub-score to [0,10] and DERIVE the composite from them."""
    raw_scores = data.get("scores") or {}
    scores = {k: max(0, min(10, _coerce_int(raw_scores.get(k), 0))) for k in REVIEW_DIMENSIONS}
    reasoning = str(data.get("reasoning") or "").strip() or "no reasoning provided"
    return {
        "scores": scores,
        "composite": composite_score(scores),
        "reasoning": reasoning,
    }


def validate_review_verdict(data: dict) -> bool:
    """Deterministic anchor: each dim int in [0,10] + composite == derived
    + non-empty reasoning."""
    scores = data.get("scores")
    if not isinstance(scores, dict):
        return False
    for k in REVIEW_DIMENSIONS:
        v = scores.get(k)
        if not isinstance(v, int) or isinstance(v, bool):
            return False
        if v < 0 or v > 10:
            return False
    composite = data.get("composite")
    if not isinstance(composite, int) or isinstance(composite, bool):
        return False
    if composite != composite_score(scores):
        return False
    reasoning = data.get("reasoning")
    if not isinstance(reasoning, str) or not reasoning.strip():
        return False
    return True

class PeerReview(gl.Contract):
    papers: TreeMap[str, str]
    paper_count: u256

    def __init__(self):
        self.paper_count = u256(0)

    @gl.public.write
    def submit_paper(self, title: str, abstract: str, paper_url: str) -> str:
        key = str(int(self.paper_count))
        paper = {"author": str(gl.message.sender_address), "title": str(title).strip(), "abstract": str(abstract).strip()[:2000], "url": str(paper_url).strip(), "reviewed": False, "scores": {}, "composite": 0, "reasoning": ""}
        self.papers[key] = json.dumps(paper)
        self.paper_count += u256(1)
        return key

    @gl.public.write
    def review_paper(self, key: str) -> None:
        key = str(key)
        if key not in self.papers: raise Exception("unknown")
        paper = json.loads(self.papers[key])
        verdict = self._review(paper)
        paper["reviewed"] = True; paper["scores"] = verdict["scores"]; paper["composite"] = verdict["composite"]; paper["reasoning"] = verdict["reasoning"]
        self.papers[key] = json.dumps(paper)

    def _review(self, paper):
        def leader_fn() -> str:
            content = "(failed)"
            if paper["url"].startswith("http"):
                try: content = gl.nondet.web.get(paper["url"]).body.decode("utf-8")[:5000]
                except: pass
            prompt = f"""Peer review this paper.\nTITLE: {paper['title']}\nABSTRACT: {paper['abstract']}\nCONTENT:\n{content}\n\nScore (0-10): novelty, methodology, clarity, reproducibility.\nReply JSON: {{"scores": {{"novelty": <int>, "methodology": <int>, "clarity": <int>, "reproducibility": <int>}}, "reasoning": "<review>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            data = raw if isinstance(raw, dict) else json.loads(str(raw).strip())
            return json.dumps(normalize_review_verdict(data))
        def validator_fn(r) -> bool:
            if not isinstance(r, gl.vm.Return): return False
            try: return validate_review_verdict(json.loads(r.calldata))
            except: return False
        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.view
    def get_paper(self, key: str) -> dict:
        key = str(key)
        if key not in self.papers: return {"exists": False}
        return json.loads(self.papers[key])

    @gl.public.view
    def stats(self) -> dict:
        return {"total_papers": int(self.paper_count)}
