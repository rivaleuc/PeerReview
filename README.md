# PeerReview

**Decentralized academic peer review. Submit a paper, get a consensus AI review scoring novelty, methodology, clarity, and reproducibility.**

PeerReview replaces the slow, opaque journal pipeline with an on-chain reviewer. An author submits a title, abstract, and a URL to the full text; GenLayer validators fetch the paper, read it, and return numeric scores across four standard axes plus a written review. Because the score is reached by consensus, no single reviewer can sink or inflate a paper, and the review is permanent and public.

- **Contract (Bradbury, chain 4221):** `0x448747bD5D7c9951dAb0FD9D7DB73F45C01Bc9B6`
- **Explorer:** https://explorer-bradbury.genlayer.com/contract/0x448747bD5D7c9951dAb0FD9D7DB73F45C01Bc9B6
- **Live app:** https://peerreview.pages.dev

## What it does

The `PeerReview` contract has two writes and two views:

1. **`submit_paper(title, abstract, paper_url)`** — stores a JSON record (author address, title, abstract ≤2000 chars, URL, `reviewed: False`, empty `scores`) in `papers: TreeMap[str, str]` keyed by an incrementing `paper_count`. Returns the key.
2. **`review_paper(key)`** — runs the non-deterministic review. The leader function calls `gl.nondet.web.get(paper["url"]).body.decode("utf-8")` to fetch the content (truncated to 5000 chars), then `gl.nondet.exec_prompt(prompt, response_format="json")` to peer-review it, returning `{"scores": {"novelty": <int>, "methodology": <int>, "clarity": <int>, "reproducibility": <int>}, "reasoning": "<review>"}` (each axis scored 0–10). Consensus is enforced by `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`, where `validator_fn` accepts a `gl.vm.Return` only if all four score fields are integers. The paper is marked `reviewed`, and scores plus reasoning are stored.
3. **`get_paper(key)`** — view returning the full paper record with scores (or `{"exists": False}`).
4. **`stats()`** — view returning `{"total_papers": <int>}`.

## Why GenLayer

A deterministic VM cannot read a research paper and assess its novelty or methodology — that is exactly the expert judgment peer review exists to provide, and there is no oracle for it. Traditional review also concentrates power in one or two anonymous referees.

GenLayer's Optimistic Democracy distributes that judgment: the leader proposes scores and a written review, and independent validators each re-fetch the paper and re-run the assessment, finalising only if the structured scores survive `validator_fn`. A biased or careless single reviewer is outvoted by consensus.

Use GenLayer when the output is an expert judgment over unstructured scholarly content that must be trustless and reproducible. Use a backend when scoring is a deterministic rubric that doesn't need decentralized agreement.

## Architecture

| Contract (GenLayer) | Frontend | EVM / off-chain |
| --- | --- | --- |
| `review/peer_review.py` | `review/app` (React + Vite) | none — the paper fetch happens inside the contract |

## Tech

- **GenVM Python**, pinned to `py-genlayer:1jb45aa8…jpz09h6` via the `Depends` header. Papers are JSON-encoded into a `TreeMap[str, str]` with a `u256` counter; the `scores` object is a nested dict serialized alongside the record.
- **Frontend** reads with `genlayer-js` (`createClient({ chain: testnetBradbury })` → `readContract`) and writes via **MetaMask without the snap** — it calls `wallet_switchEthereumChain` / `wallet_addEthereumChain` to put the wallet on Bradbury (chain `4221`, hex `0x107d`) and signs with `writeContract`, awaiting a `FINALIZED` receipt.
- **UI:** React 19 + Vite + Tailwind v4 with `framer-motion` and `sonner`. The app is a submission portal: submit a paper, trigger the review, and read the four-axis score card with the full written review.

## Project structure

```
PeerReview/
├── review/
│   ├── peer_review.py        ← GenLayer contract (PeerReview)
│   └── app/                  ← production frontend
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig*.json
│       ├── public/           ← favicon.svg, icons.svg
│       └── src/
│           ├── App.tsx       ← UI
│           ├── genlayer.ts   ← client, wallet, read/write helpers
│           ├── main.tsx
│           └── index.css
└── README.md
```

## Develop

```bash
cd review/app
npm install
npm run dev      # local dev server (Vite)
npm run build    # type-check + production build to dist/
```

## Deploy the frontend

Cloudflare Pages:

- **Root directory:** `review/app`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment:** `NODE_VERSION=20`

## Why GenLayer (engineering notes)

- **`validator_fn` checks every axis.** It re-parses the `gl.vm.Return` calldata and requires `novelty`, `methodology`, `clarity`, and `reproducibility` to all be integers via `all(isinstance(s.get(k), int) ...)`. A leader that drops an axis or returns a float fails consensus rather than storing a half-filled score card.
- **Nested-dict storage.** Unlike the flat records elsewhere, `scores` is a sub-object; it's serialized as part of the JSON value and rebuilt with `json.loads` on every read.
- **Content fetch fails open.** `gl.nondet.web.get` is wrapped in try/except with a `"(failed)"` fallback and truncated to 5000 chars, so an unreachable PDF/host still yields a (low) review instead of reverting.
- **TreeMap holds serialized JSON** — `json.loads` → mutate → `json.dumps`; never mutate storage in place.

## License

MIT
