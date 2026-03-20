import { useState } from 'react'
import { api } from '../api'

function ScoreBadge({ score, daysOld }) {
  if (score >= 15) return <span className="badge-revolutionary">🔥 REVOLUTIONARY</span>
  if (score >= 10) return <span className="badge-highimpact">📈 HIGH IMPACT</span>
  if (daysOld < 30 && score > 7) return <span className="badge-trending">⚡ TRENDING</span>
  return <span className="badge-standard">📄 Standard</span>
}

function StatBox({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-brand-500/10 border border-brand-500/20' : 'bg-gray-800'}`}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

export default function PaperCard({ paper, index }) {
  const [open, setOpen] = useState(false)
  const [abstractOpen, setAbstractOpen] = useState(false)
  const [relatedOpen, setRelatedOpen] = useState(false)
  const [related, setRelated] = useState(null)
  const [relatedLoading, setRelatedLoading] = useState(false)

  const maxH = Math.max(...(paper.h_indices?.length ? paper.h_indices : [0]))

  async function loadRelated() {
    if (related) { setRelatedOpen(o => !o); return }
    setRelatedOpen(true)
    setRelatedLoading(true)
    try {
      // Find the author_id for the highest h-index author
      let topAuthorId = null
      if (paper.author_ids?.length && paper.h_indices?.length) {
        const paired = paper.h_indices.map((h, i) => [h, paper.author_ids[i]]).sort((a, b) => b[0] - a[0])
        topAuthorId = paired[0][1]
      }
      const data = await api.related(topAuthorId, paper.s2_id)
      setRelated(data)
    } catch {
      setRelated({ error: 'Could not load related papers.' })
    } finally {
      setRelatedLoading(false)
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-800/50 transition-colors duration-150"
      >
        <span className="text-gray-500 font-mono text-sm pt-0.5 shrink-0">#{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <ScoreBadge score={paper.score} daysOld={paper.days_old} />
            <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">
              Score: {paper.score}
            </span>
          </div>
          <p className="font-semibold text-white text-sm leading-snug">{paper.Title}</p>
          <p className="text-gray-500 text-xs mt-1 truncate">{paper.Authors}</p>
        </div>
        <span className="text-gray-600 text-lg shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-gray-800 px-5 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left: content */}
            <div className="flex-1 space-y-4">
              {paper.tldr && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-sm text-blue-200">
                  <span className="font-semibold text-blue-400">TL;DR · </span>{paper.tldr}
                </div>
              )}

              {/* Abstract */}
              <div>
                <button
                  onClick={() => setAbstractOpen(o => !o)}
                  className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
                >
                  {abstractOpen ? '▲' : '▶'} Full Abstract
                </button>
                {abstractOpen && (
                  <p className="mt-2 text-sm text-gray-300 leading-relaxed bg-gray-800/60 rounded-lg p-3">
                    {paper.Abstract}
                  </p>
                )}
              </div>

              {/* Why */}
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Why this ranked here</p>
                <p className="text-sm text-gray-400 leading-relaxed">{paper.why}</p>
              </div>

              {/* Links */}
              <div className="flex gap-3 pt-1">
                <a
                  href={paper.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm py-1.5 px-4 inline-block"
                >
                  View on arXiv →
                </a>
                {paper.pwc?.has_code && (
                  <a
                    href={`https://paperswithcode.com/paper/${paper.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-sm py-1.5 px-4 inline-block border border-gray-700"
                  >
                    💻 Code ({paper.pwc.stars} ⭐)
                  </a>
                )}
              </div>
            </div>

            {/* Right: stats */}
            <div className="lg:w-44 grid grid-cols-2 lg:grid-cols-1 gap-2">
              <StatBox label="Citations" value={paper.Citations} />
              <StatBox label="Influential" value={paper.Influential} />
              {maxH > 0 && <StatBox label="Lead h-index" value={maxH} highlight={maxH > 40} />}
              <StatBox label="Days Old" value={paper.days_old} />
              {maxH > 40 && (
                <div className="col-span-2 lg:col-span-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center text-xs text-yellow-400 font-semibold">
                  ⭐ Top-Tier Author
                </div>
              )}
            </div>
          </div>

          {/* Related papers */}
          <div className="border-t border-gray-800 pt-3">
            <button
              onClick={loadRelated}
              className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors font-medium"
            >
              {relatedOpen ? '▲' : '▶'} {relatedOpen ? 'Hide' : 'Show'} Related Papers
            </button>

            {relatedOpen && (
              <div className="mt-3">
                {relatedLoading ? (
                  <p className="text-gray-500 text-sm animate-pulse">Loading related papers…</p>
                ) : related?.error ? (
                  <p className="text-red-400 text-sm">{related.error}</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Author papers */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Other works by lead author</p>
                      {related?.author_papers?.length ? (
                        <ul className="space-y-2">
                          {related.author_papers.map((ap, i) => {
                            const aid = ap.externalIds?.ArXiv
                            return (
                              <li key={i} className="text-sm bg-gray-800/60 rounded-lg p-2.5">
                                <p className="text-gray-200 font-medium leading-snug">{ap.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span>{ap.year || '?'}</span>
                                  <span>·</span>
                                  <span>{ap.citationCount ?? 0} citations</span>
                                  {aid && (
                                    <>
                                      <span>·</span>
                                      <a href={`https://arxiv.org/abs/${aid}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">arXiv</a>
                                    </>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      ) : <p className="text-gray-500 text-sm">No author data found.</p>}
                    </div>

                    {/* Similar papers */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Papers with similar ideas</p>
                      {related?.similar_papers?.length ? (
                        <ul className="space-y-2">
                          {related.similar_papers.map((sp, i) => {
                            const sid = sp.externalIds?.ArXiv
                            return (
                              <li key={i} className="text-sm bg-gray-800/60 rounded-lg p-2.5">
                                <p className="text-gray-200 font-medium leading-snug">{sp.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span>{sp.year || '?'}</span>
                                  <span>·</span>
                                  <span>{sp.citationCount ?? 0} citations</span>
                                  {sid && (
                                    <>
                                      <span>·</span>
                                      <a href={`https://arxiv.org/abs/${sid}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">arXiv</a>
                                    </>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      ) : <p className="text-gray-500 text-sm">No similar papers found.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
