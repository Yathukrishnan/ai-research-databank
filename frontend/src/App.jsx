import { useState } from 'react'
import AuthPage from './components/AuthPage'
import Sidebar from './components/Sidebar'
import PaperCard from './components/PaperCard'
import { api } from './api'

const PERSONAS = ['Researcher', 'ML Engineer', 'Student', 'Developer/Hobbyist']

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rdb_user')) } catch { return null }
  })
  const [persona, setPersona] = useState(user?.persona || 'Researcher')
  const [query, setQuery] = useState('')
  const [papers, setPapers] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleLogin(u) {
    localStorage.setItem('rdb_user', JSON.stringify(u))
    setUser(u)
    setPersona(u.persona)
  }

  function handleLogout() {
    localStorage.removeItem('rdb_user')
    setUser(null)
    setPapers(null)
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setError(''); setLoading(true); setPapers(null)
    try {
      const results = await api.search(query.trim(), persona)
      setPapers(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <AuthPage onLogin={handleLogin} />

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={user}
        persona={persona}
        onPersonaChange={setPersona}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-5xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">🧠 AI Research Databank</h1>
          <p className="text-gray-400 text-sm mt-1">
            Curated arXiv papers ranked for your <span className="text-brand-400 font-medium">{persona}</span> profile
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            className="input flex-1"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Flash Attention, LLM reasoning, diffusion models…"
          />
          <button className="btn-primary shrink-0 px-6" type="submit" disabled={loading || !query.trim()}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Fetching…
              </span>
            ) : 'Curate Feed'}
          </button>
        </form>

        {/* Loading state */}
        {loading && (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3 animate-pulse">🧠</div>
            <p className="text-gray-300 font-medium">Fetching & scoring papers…</p>
            <p className="text-gray-500 text-sm mt-1">Enriching with Semantic Scholar & Papers With Code</p>
          </div>
        )}

        {/* Error */}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-4">{error}</div>}

        {/* Results */}
        {papers && !loading && (
          <>
            {papers.length > 0 ? (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  Showing <span className="text-white font-semibold">{papers.length}</span> papers ranked for{' '}
                  <span className="text-brand-400 font-semibold">{persona}</span>
                </p>
                <div className="space-y-3">
                  {papers.map((paper, i) => (
                    <PaperCard key={paper.arxiv_id} paper={paper} index={i} />
                  ))}
                </div>
              </>
            ) : (
              <div className="card p-8 text-center text-gray-500">No papers found. Try a different search term.</div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
