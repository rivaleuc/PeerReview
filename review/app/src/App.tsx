import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0x448747bD5D7c9951dAb0FD9D7DB73F45C01Bc9B6'

type Dimension = 'novelty' | 'methodology' | 'clarity' | 'reproducibility'
const DIMENSIONS: Dimension[] = ['novelty', 'methodology', 'clarity', 'reproducibility']

interface Paper {
  id: string
  title: string
  authors: string
  abstract: string
  reviewed: boolean
  reviewing?: boolean
  scores?: Record<Dimension, number>
}

const SEED_PAPERS: Paper[] = [
  {
    id: 'PR-2024-031',
    title: 'Consensus Under Subjectivity: Optimistic Validation of LLM Verdicts',
    authors: 'A. Reyes, K. Tan, M. Osei',
    abstract: 'We formalise a protocol in which a validator set reaches agreement on the output of non-deterministic language-model judgements.',
    reviewed: true,
    scores: { novelty: 9, methodology: 8, clarity: 7, reproducibility: 8 },
  },
  {
    id: 'PR-2024-030',
    title: 'On the Reproducibility of Prompt-Conditioned Benchmarks',
    authors: 'L. Becker, S. Nakamura',
    abstract: 'A systematic study of variance in benchmark scores under fixed prompts and shifting decoding parameters across nine open models.',
    reviewed: true,
    scores: { novelty: 6, methodology: 9, clarity: 8, reproducibility: 9 },
  },
  {
    id: 'PR-2024-029',
    title: 'Decentralised Authorship Attestation via Zero-Knowledge Citations',
    authors: 'P. Andersson',
    abstract: 'We propose a scheme allowing authors to prove citation integrity without revealing the underlying reference graph.',
    reviewed: true,
    scores: { novelty: 8, methodology: 6, clarity: 7, reproducibility: 5 },
  },
]

const STEPS = [
  { n: '1', title: 'Submit the manuscript', body: 'Authors post a title, abstract, and link. The submission is recorded immutably with a review identifier.' },
  { n: '2', title: 'Independent assessment', body: 'GenLayer validators each read the paper and score it across four established dimensions of scholarship.' },
  { n: '3', title: 'Consensus scoring', body: 'Individual assessments are reconciled into a single, tamper-proof score with written reasoning attached.' },
  { n: '4', title: 'Open record', body: 'Scores and reviews are published on-chain — transparent, citable, and free from editorial gatekeeping.' },
]

const FEATURES = [
  { icon: '◆', title: 'Four-dimension rubric', body: 'Every paper is scored on novelty, methodology, clarity, and reproducibility — the pillars of credible work.' },
  { icon: '⚖', title: 'Impartial validators', body: 'No editor, no cartel. A decentralised validator set assesses each manuscript independently.' },
  { icon: '🔗', title: 'Immutable record', body: 'Submissions and verdicts are written on-chain and cannot be silently retracted or revised.' },
  { icon: '✎', title: 'Reasoned reviews', body: 'Each score arrives with written justification, so authors understand the assessment, not just the number.' },
  { icon: '🌍', title: 'Open access', body: 'Reviews are public goods. Anyone may read, cite, or build upon the recorded assessments.' },
  { icon: '⏱', title: 'Days, not months', body: 'Consensus review collapses the traditional cycle from half a year to a matter of days.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

function avg(scores: Record<Dimension, number>) {
  return (DIMENSIONS.reduce((a, d) => a + scores[d], 0) / DIMENSIONS.length).toFixed(1)
}

export default function App() {
  const [papers, setPapers] = useState<Paper[]>(SEED_PAPERS)
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [abstract, setAbstract] = useState('')
  const [reviewing, setReviewing] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !abstract.trim()) {
      toast.error('Title and abstract are required.')
      return
    }
    const id = `PR-2024-${String(32 + papers.length).padStart(3, '0')}`
    const fresh: Paper = {
      id,
      title: title.trim(),
      authors: authors.trim() || 'Anonymous',
      abstract: abstract.trim(),
      reviewed: false,
      reviewing: true,
    }
    setPapers((p) => [fresh, ...p])
    setReviewing(true)
    toast(`${id} submitted — validators reviewing…`, { icon: '📄' })

    setTimeout(() => {
      const base = (title.length + abstract.length) % 5
      const scores: Record<Dimension, number> = {
        novelty: 6 + ((base + 2) % 4),
        methodology: 6 + ((base + 1) % 4),
        clarity: 6 + ((base + 3) % 4),
        reproducibility: 5 + (base % 5),
      }
      setPapers((p) =>
        p.map((paper) =>
          paper.id === id ? { ...paper, reviewing: false, reviewed: true, scores } : paper,
        ),
      )
      setReviewing(false)
      toast.success(`${id} reviewed — composite score ${avg(scores)}/10.`)
      setTitle('')
      setAuthors('')
      setAbstract('')
    }, 3000)
  }

  return (
    <div className="min-h-screen text-[#1a1a1a] bg-white overflow-x-hidden">
      <Toaster theme="light" position="top-right" toastOptions={{ style: { background: '#ffffff', border: '1px solid #9b1b3033', color: '#1a1a1a', fontFamily: 'Source Serif 4, serif' } }} />

      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-[#e7e2d9]">
        <nav className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-sm bg-[#9b1b30] text-white font-display font-bold text-lg">P</span>
            <span className="font-display text-2xl font-semibold tracking-tight">The Ledger<span className="text-[#9b1b30]"> Review</span></span>
          </a>
          <div className="hidden md:flex items-center gap-9 text-[15px] text-[#5a5550]">
            <a href="#how" className="hover:text-[#9b1b30] transition">Process</a>
            <a href="#features" className="hover:text-[#9b1b30] transition">Standards</a>
            <a href="#archive" className="hover:text-[#9b1b30] transition">Archive</a>
          </div>
          <a href="#submit" className="text-[15px] px-5 py-2 rounded-sm bg-[#9b1b30] text-white hover:bg-[#7d1526] transition">
            Submit a paper
          </a>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className="border-b border-[#e7e2d9]">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-24 text-center">
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}
            className="text-[#9b1b30] tracking-[0.25em] text-xs uppercase mb-6">
            Decentralised Academic Peer Review · Vol. I
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="font-display text-5xl md:text-7xl font-semibold leading-[1.06] max-w-4xl mx-auto">
            Peer review,
            <span className="block italic text-[#9b1b30]">without the gatekeepers.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-8 text-xl text-[#5a5550] max-w-2xl mx-auto leading-relaxed">
            Submit a manuscript and a decentralised validator set scores it on novelty, methodology,
            clarity, and reproducibility — transparently, on-chain, in days rather than months.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-11 flex flex-wrap items-center justify-center gap-4">
            <a href="#submit" className="px-7 py-3.5 rounded-sm bg-[#9b1b30] text-white font-medium hover:bg-[#7d1526] transition">
              Submit a paper
            </a>
            <a href="#archive" className="px-7 py-3.5 rounded-sm border border-[#d8d2c7] text-[#1a1a1a] hover:border-[#9b1b30] transition">
              Read the archive
            </a>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <SectionHead kicker="The Process" title="From submission to settled score" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="border-t-2 border-[#9b1b30] pt-5">
              <span className="font-display text-3xl font-bold text-[#9b1b30]">{s.n}</span>
              <h3 className="font-display text-xl font-semibold mt-2 mb-2">{s.title}</h3>
              <p className="text-[15px] text-[#5a5550] leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-[#e7e2d9] bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <SectionHead kicker="Editorial Standards" title="A rigorous, open rubric" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.07 }}
                className="rounded-sm border border-[#e7e2d9] bg-white p-7 hover:border-[#9b1b30]/40 transition">
                <div className="text-2xl text-[#9b1b30] mb-4">{f.icon}</div>
                <h3 className="font-display text-xl font-semibold mb-2.5">{f.title}</h3>
                <p className="text-[15px] text-[#5a5550] leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SUBMIT + ARCHIVE */}
      <section id="submit" className="max-w-6xl mx-auto px-6 py-24">
        <SectionHead kicker="The Archive" title="Submit a manuscript for review" />
        <div className="grid lg:grid-cols-[400px_1fr] gap-10 mt-14">
          {/* form */}
          <motion.form
            onSubmit={handleSubmit}
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ duration: 0.55 }}
            className="rounded-sm border border-[#e7e2d9] bg-[#faf8f4] p-7 h-fit">
            <h3 className="font-display text-2xl font-semibold text-[#9b1b30] mb-1">Submit for review</h3>
            <p className="text-sm text-[#5a5550] mb-6">Validators return a four-dimension score in ~3 seconds.</p>

            <label className="block text-sm text-[#5a5550] mb-1.5">Title</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Manuscript title"
              className="w-full bg-white border border-[#d8d2c7] rounded-sm px-3.5 py-2.5 mb-4 text-[15px] placeholder-[#b3ada3] outline-none focus:border-[#9b1b30]" />

            <label className="block text-sm text-[#5a5550] mb-1.5">Authors</label>
            <input
              value={authors} onChange={(e) => setAuthors(e.target.value)}
              placeholder="e.g. A. Reyes, K. Tan"
              className="w-full bg-white border border-[#d8d2c7] rounded-sm px-3.5 py-2.5 mb-4 text-[15px] placeholder-[#b3ada3] outline-none focus:border-[#9b1b30]" />

            <label className="block text-sm text-[#5a5550] mb-1.5">Abstract</label>
            <textarea
              value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={4}
              placeholder="Summarise the contribution…"
              className="w-full bg-white border border-[#d8d2c7] rounded-sm px-3.5 py-2.5 mb-6 text-[15px] placeholder-[#b3ada3] outline-none focus:border-[#9b1b30] resize-none" />

            <button
              type="submit" disabled={reviewing}
              className="w-full rounded-sm py-3 bg-[#9b1b30] text-white font-medium hover:bg-[#7d1526] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {reviewing ? 'Validators reviewing…' : 'Submit for review'}
            </button>
          </motion.form>

          {/* paper cards */}
          <motion.div
            id="archive"
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.1 }}
            className="grid sm:grid-cols-2 gap-5">
            {papers.map((paper) => (
              <motion.article
                key={paper.id} layout
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-sm border border-[#e7e2d9] bg-white p-6 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs tracking-wide text-[#9b1b30] font-medium">{paper.id}</span>
                  {paper.reviewing ? (
                    <span className="text-xs text-[#9b1b30] animate-pulse">reviewing…</span>
                  ) : paper.scores ? (
                    <span className="text-xs px-2 py-0.5 rounded-sm bg-[#9b1b30] text-white">{avg(paper.scores)} / 10</span>
                  ) : null}
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug mb-1">{paper.title}</h3>
                <p className="text-xs italic text-[#8a847b] mb-3">{paper.authors}</p>
                <p className="text-[13px] text-[#5a5550] leading-relaxed mb-4 line-clamp-3">{paper.abstract}</p>

                <div className="mt-auto space-y-2">
                  {DIMENSIONS.map((d) => (
                    <div key={d}>
                      <div className="flex justify-between text-[11px] text-[#5a5550] mb-1 capitalize">
                        <span>{d}</span>
                        <span className="tabular-nums">{paper.scores ? paper.scores[d] : '—'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#efeae1] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#9b1b30]"
                          initial={{ width: 0 }}
                          animate={{ width: paper.scores ? `${paper.scores[d] * 10}%` : '0%' }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#e7e2d9] bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-sm bg-[#9b1b30] text-white font-display font-bold">P</span>
            <span className="font-display text-xl font-semibold">The Ledger<span className="text-[#9b1b30]"> Review</span></span>
          </div>
          <p className="text-xs text-[#8a847b] text-center break-all">
            Contract <span className="text-[#9b1b30]">{CONTRACT}</span> · GenLayer Bradbury
          </p>
          <p className="text-xs text-[#8a847b]">© {new Date().getFullYear()} PeerReview</p>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ duration: 0.55 }}
      className="text-center">
      <p className="text-[#9b1b30] tracking-[0.25em] text-xs uppercase mb-3">{kicker}</p>
      <h2 className="font-display text-4xl md:text-5xl font-semibold">{title}</h2>
    </motion.div>
  )
}
