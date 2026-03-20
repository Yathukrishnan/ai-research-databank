import { useState } from 'react'
import { api } from '../api'

const PERSONAS = ['Researcher', 'ML Engineer', 'Student', 'Developer/Hobbyist']

export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', persona: 'Researcher' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await api.login(form.username, form.password)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      await api.register(form.username, form.password, form.persona)
      setSuccess('Account created! Switch to Login.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-3xl font-bold text-white">AI Research Databank</h1>
          <p className="text-gray-400 mt-2">
            Personalised arXiv paper recommendations — ranked by quality, not recency
          </p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-6">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all duration-150 ${
                  tab === t ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t === 'login' ? 'Login' : 'Create Account'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input className="input" value={form.username} onChange={e => set('username', e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-gray-400 text-sm">Tell us who you are so we can tune recommendations from day one.</p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input className="input" value={form.username} onChange={e => set('username', e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">I primarily use AI research for:</label>
                <select
                  className="input"
                  value={form.persona}
                  onChange={e => set('persona', e.target.value)}
                >
                  {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}
              <button className="btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
