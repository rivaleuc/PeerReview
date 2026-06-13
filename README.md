# PeerReview

PeerReview is decentralized academic peer review on GenLayer. Submit a paper with title, abstract, and URL. AI validators fetch the content and score it on four dimensions: novelty, methodology, clarity, and reproducibility. No waiting months for reviewers, no single biased gatekeeper.

## Why GenLayer

Peer review requires reading a paper, understanding its methodology, assessing novelty against existing literature, and judging clarity of exposition. This is multi-dimensional interpretation that no deterministic system can perform. GenLayer validators independently read the paper, evaluate each dimension, and reach consensus on scores. Multiple diverse models provide more balanced reviews than any single reviewer.

## Deployed

**GenLayer (Bradbury):** `0x448747bD5D7c9951dAb0FD9D7DB73F45C01Bc9B6`

## Test

Submitted: "Decentralized AI Consensus" → paper stored, waiting for review trigger.

## Structure

```
PeerReview/
├── review/
│   ├── peer_review.py  ← GenLayer contract
│   └── index.html      ← Frontend
└── .gitignore
```
