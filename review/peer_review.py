# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

class PeerReview(gl.Contract):
    papers: TreeMap[str, str]
    paper_count: u256

    def __init__(self):
        self.paper_count = u256(0)

    @gl.public.write
    def submit_paper(self, title: str, abstract: str, paper_url: str) -> str:
        key = str(int(self.paper_count))
        paper = {"author": str(gl.message.sender_address), "title": str(title).strip(), "abstract": str(abstract).strip()[:2000], "url": str(paper_url).strip(), "reviewed": False, "scores": {}, "reasoning": ""}
        self.papers[key] = json.dumps(paper)
        self.paper_count += u256(1)
        return key

    @gl.public.write
    def review_paper(self, key: str) -> None:
        key = str(key)
        if key not in self.papers: raise Exception("unknown")
        paper = json.loads(self.papers[key])
        verdict = self._review(paper)
        paper["reviewed"] = True; paper["scores"] = verdict["scores"]; paper["reasoning"] = verdict["reasoning"]
        self.papers[key] = json.dumps(paper)

    def _review(self, paper):
        def leader_fn() -> str:
            content = "(failed)"
            if paper["url"].startswith("http"):
                try: content = gl.nondet.web.get(paper["url"]).body.decode("utf-8")[:5000]
                except: pass
            prompt = f"""Peer review this paper.\nTITLE: {paper['title']}\nABSTRACT: {paper['abstract']}\nCONTENT:\n{content}\n\nScore (0-10): novelty, methodology, clarity, reproducibility.\nReply JSON: {{"scores": {{"novelty": <int>, "methodology": <int>, "clarity": <int>, "reproducibility": <int>}}, "reasoning": "<review>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(raw) if isinstance(raw, dict) else str(raw).strip()
        def validator_fn(r) -> bool:
            if not isinstance(r, gl.vm.Return): return False
            try: s = json.loads(r.calldata).get("scores",{}); return all(isinstance(s.get(k), int) for k in ("novelty","methodology","clarity","reproducibility"))
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
