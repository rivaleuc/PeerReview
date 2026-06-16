import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { connectWallet, isWalletConnected, read, write, CONTRACT } from './genlayer'

const CRIMSON = '#9B1B30'

type Scores = { novelty: number; methodology: number; clarity: number; reproducibility: number }

type Paper = {
  id: string
  title: string
  authors: string
  abstract: string
  field: string
  status: 'reviewed' | 'in-review'
  scores: Scores
  reasoning: string
}

const PAPERS: Paper[] = [
  {
    id: 'arx-2418',
    title: 'Verifiable Latent Diffusion under Zero-Knowledge Constraints',
    authors: 'R. Okafor, M. Lindqvist, S. Banerjee',
    field: 'Machine Learning · Cryptography',
    status: 'reviewed',
    abstract:
      'We present a framework for proving the provenance of diffusion-model outputs without revealing model weights, combining succinct non-interactive arguments with a novel noise-schedule commitment scheme. Empirically, verification cost scales sub-linearly with sampling steps.',
    scores: { novelty: 88, methodology: 76, clarity: 82, reproducibility: 64 },
    reasoning:
      'The commitment scheme is genuinely original and the sub-linear verification claim is well-supported by Section 5. Methodology is sound though the ablation over noise schedules is thin. Reproducibility suffers from an unreleased training corpus; the authors should publish seeds and the schedule generator.',
  },
  {
    id: 'arx-2391',
    title: 'On the Convergence of Federated Agents in Adversarial Markets',
    authors: 'J. Park, A. Moreau',
    field: 'Multi-Agent Systems',
    status: 'reviewed',
    abstract:
      'A game-theoretic analysis of federated learning agents competing in a shared market, deriving convergence bounds under bounded adversarial perturbation and proposing an incentive-compatible aggregation rule.',
    scores: { novelty: 71, methodology: 90, clarity: 68, reproducibility: 85 },
    reasoning:
      'Mathematically rigorous with tight bounds and a clean incentive-compatibility proof. The exposition in Sections 3–4 is dense and would benefit from a worked example. Code and simulation harness are fully released, an exemplary reproducibility standard.',
  },
  {
    id: 'arx-2377',
    title: 'Sparse Mixture Routing for Low-Latency On-Chain Inference',
    authors: 'L. Castellano, D. Wu, P. Adeyemi, K. Sørensen',
    field: 'Systems · ML Efficiency',
    status: 'reviewed',
    abstract:
      'We route transformer experts conditioned on gas budgets, achieving 3.2× latency reduction for on-chain inference while preserving accuracy within 1.1% of the dense baseline.',
    scores: { novelty: 64, methodology: 79, clarity: 91, reproducibility: 72 },
    reasoning:
      'Exceptionally clear writing and figures. The gas-conditioned routing is incremental relative to prior MoE work but the on-chain framing is practical and timely. Baselines are fair; would like to see variance across more than three seeds.',
  },
  {
    id: 'arx-2402',
    title: 'Causal Attribution in Decentralised Oracle Networks',
    authors: 'F. Nakamura, E. Rossi',
    field: 'Distributed Systems',
    status: 'in-review',
    abstract:
      'A method for attributing price-feed deviations to individual oracle nodes using causal graphs reconstructed from on-chain attestations.',
    scores: { novelty: 0, methodology: 0, clarity: 0, reproducibility: 0 },
    reasoning: 'Assigned to 3 validators. Reviews close in 18 hours.',
  },
]

const DIMS: { key: keyof Scores; label: string }[] = [
  { key: 'novelty', label: 'Novelty' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'reproducibility', label: 'Reproducibility' },
]

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm font-medium text-stone-700">{label}</span>
        <span className="font-display text-sm font-semibold tabular-nums" style={{ color: CRIMSON }}>{value || '—'}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/70">
        <motion.div
          className="h-full rounded-full"
          style={{ background: CRIMSON }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function App() {
  const [papers, setPapers] = useState(PAPERS)
  const [selectedId, setSelectedId] = useState(PAPERS[0].id)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', authors: '', field: '', abstract: '' })
  const [wallet, setWallet] = useState<string | null>(null)

  async function handleConnect() {
    try {
      const addr = await connectWallet()
      setWallet(addr)
      toast.success('Wallet connected', { description: `${addr.slice(0, 6)}…${addr.slice(-4)}` })
    } catch (e: any) {
      toast.error('Wallet connection failed', { description: e?.message ?? String(e) })
    }
  }

  const selected = papers.find((p) => p.id === selectedId)!

  async function submit() {
    if (!form.title.trim() || !form.authors.trim()) {
      toast.error('Title and authors are required')
      return
    }
    const id = 'arx-' + Math.floor(2400 + Math.random() * 99)
    const pending: Paper = {
      id,
      title: form.title.trim(),
      authors: form.authors.trim(),
      field: form.field.trim() || 'Unclassified',
      status: 'in-review',
      abstract: form.abstract.trim() || 'No abstract provided.',
      scores: { novelty: 0, methodology: 0, clarity: 0, reproducibility: 0 },
      reasoning: 'Submitted on-chain. Validators reviewing…',
    }
    setPapers((p) => [pending, ...p])
    setSelectedId(id)
    setModal(false)
    const abstract = form.abstract.trim() || form.title.trim()
    setForm({ title: '', authors: '', field: '', abstract: '' })
    toast.loading('Submitting manuscript on-chain…', { id: 'rev' })
    try {
      // 1) submit the paper (paper_url optional)
      await write('submit_paper', [pending.title, abstract, ''])
      // 2) locate it
      const stats: any = await read('stats')
      const key = String(Number(stats.total_papers) - 1)
      // 3) trigger the AI review
      toast.loading('Validators scoring the paper…', { id: 'rev' })
      await write('review_paper', [key])
      // 4) read the real scores
      const p: any = await read('get_paper', [key])
      const s = p.scores || {}
      const scores: Scores = {
        novelty: Number(s.novelty ?? 0),
        methodology: Number(s.methodology ?? 0),
        clarity: Number(s.clarity ?? 0),
        reproducibility: Number(s.reproducibility ?? 0),
      }
      setPapers((arr) =>
        arr.map((x) =>
          x.id === id ? { ...x, status: 'reviewed', scores, reasoning: String(p.reasoning || '') } : x,
        ),
      )
      toast.success('Review complete — scores recorded on-chain', { id: 'rev' })
    } catch (e: any) {
      setPapers((arr) =>
        arr.map((x) => (x.id === id ? { ...x, reasoning: 'Review failed: ' + (e?.message?.slice(0, 100) ?? '') } : x)),
      )
      toast.error('Review failed', { id: 'rev', description: e?.message?.slice(0, 120) ?? String(e) })
    }
  }

  const avg = (s: Scores) => Math.round((s.novelty + s.methodology + s.clarity + s.reproducibility) / 4)

  return (
    <div className="min-h-screen bg-white" style={{ color: '#1a1a1a' }}>
      <Toaster position="top-center" />

      {/* MASTHEAD */}
      <header className="border-b-2" style={{ borderColor: CRIMSON }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: CRIMSON }}>PeerReview</h1>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.25em] text-stone-400">Decentralised Journal of Record</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden font-mono text-[11px] text-stone-400 sm:inline">vol. III · {papers.length} manuscripts</span>
            <button
              onClick={handleConnect}
              className="rounded-sm border px-4 py-2 font-display text-sm font-semibold transition hover:brightness-110"
              style={
                (wallet ?? isWalletConnected())
                  ? { borderColor: CRIMSON, color: CRIMSON }
                  : { background: CRIMSON, borderColor: CRIMSON, color: '#fff' }
              }
            >
              {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect Wallet'}
            </button>
            <button
              onClick={() => setModal(true)}
              className="rounded-sm px-4 py-2 font-display text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: CRIMSON }}
            >
              Submit paper
            </button>
          </div>
        </div>
      </header>

      {/* TWO-COLUMN READER */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 px-6 lg:grid-cols-[300px_1fr]">
        {/* TABLE OF CONTENTS */}
        <aside className="border-stone-200 py-6 lg:border-r lg:pr-6">
          <p className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Contents</p>
          <ol className="space-y-1">
            {papers.map((p, i) => {
              const on = p.id === selectedId
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className={`group w-full border-l-2 py-2.5 pl-3 pr-2 text-left transition ${on ? 'bg-stone-50' : 'border-transparent hover:bg-stone-50'}`}
                    style={on ? { borderColor: CRIMSON } : undefined}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                      <span className={`font-display text-[15px] leading-snug ${on ? 'font-semibold' : 'font-normal text-stone-700'}`} style={on ? { color: CRIMSON } : undefined}>
                        {p.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 pl-6">
                      <span className="text-[11px] text-stone-400">{p.authors.split(',')[0]} et al.</span>
                      {p.status === 'in-review' ? (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">in review</span>
                      ) : (
                        <span className="font-mono text-[11px] font-semibold" style={{ color: CRIMSON }}>{avg(p.scores)}</span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>

        {/* PAPER DETAIL */}
        <main className="py-8 lg:pl-10">
          <AnimatePresence mode="wait">
            <motion.article
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-stone-400">
                <span>{selected.id}</span>
                <span className="h-1 w-1 rounded-full bg-stone-300" />
                <span>{selected.field}</span>
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-stone-900">{selected.title}</h2>
              <p className="mt-2 font-display text-base italic text-stone-500">{selected.authors}</p>

              <div className="my-6 h-px w-full bg-stone-200" />

              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Abstract</p>
              <p className="mt-2 text-[17px] leading-relaxed text-stone-700" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {selected.abstract}
              </p>

              {/* SCORE PANEL */}
              <div className="mt-8 rounded-md border border-stone-200 bg-stone-50/60 p-6">
                <div className="flex items-center justify-between">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Validator Assessment</p>
                  {selected.status === 'reviewed' ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-bold" style={{ color: CRIMSON }}>{avg(selected.scores)}</span>
                      <span className="text-xs text-stone-400">/ 100 composite</span>
                    </div>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">awaiting reviews</span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {DIMS.map((d) => (
                    <ScoreBar key={d.key} label={d.label} value={selected.scores[d.key]} />
                  ))}
                </div>

                <div className="mt-6 border-t border-stone-200 pt-4">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Reviewer reasoning</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                    {selected.reasoning}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toast.success('Citation copied', { description: `${selected.authors} — ${selected.id}` })}
                    className="rounded-sm border px-3.5 py-2 font-display text-sm font-medium transition hover:bg-white"
                    style={{ borderColor: CRIMSON, color: CRIMSON }}
                  >
                    Cite
                  </button>
                  <button
                    onClick={() => toast('Attestation recorded on-chain', { description: 'Your endorsement is now public' })}
                    className="rounded-sm px-3.5 py-2 font-display text-sm font-medium text-white transition hover:brightness-110"
                    style={{ background: CRIMSON }}
                  >
                    Endorse
                  </button>
                  <span className="ml-auto font-mono text-[10px] text-stone-300">attested via {CONTRACT.slice(0, 10)}…</span>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </main>
      </div>

      {/* SUBMIT MODAL */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-30 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative z-10 w-full max-w-lg rounded-md border border-stone-200 bg-white p-7 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b-2 pb-3" style={{ borderColor: CRIMSON }}>
                <h3 className="font-display text-xl font-bold" style={{ color: CRIMSON }}>Submit Manuscript</h3>
                <button onClick={() => setModal(false)} className="text-stone-400 hover:text-stone-700">✕</button>
              </div>

              <div className="mt-5 space-y-4">
                {([
                  ['title', 'Title', 'The full title of your work'],
                  ['authors', 'Authors', 'Comma-separated, e.g. A. Smith, B. Jones'],
                  ['field', 'Field', 'e.g. Machine Learning · Systems'],
                ] as const).map(([key, label, ph]) => (
                  <div key={key}>
                    <label className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</label>
                    <input
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={ph}
                      className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9B1B30]"
                    />
                  </div>
                ))}
                <div>
                  <label className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Abstract</label>
                  <textarea
                    value={form.abstract}
                    onChange={(e) => setForm((f) => ({ ...f, abstract: e.target.value }))}
                    placeholder="A concise summary of contributions…"
                    className="mt-1 h-24 w-full resize-none rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9B1B30]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => setModal(false)} className="rounded-sm px-4 py-2 font-display text-sm font-medium text-stone-500 hover:text-stone-800">Cancel</button>
                <button onClick={submit} className="rounded-sm px-5 py-2 font-display text-sm font-semibold text-white transition hover:brightness-110" style={{ background: CRIMSON }}>
                  Submit for review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
