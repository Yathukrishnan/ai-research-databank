const PERSONAS = ['Researcher', 'ML Engineer', 'Student', 'Developer/Hobbyist']

export default function Sidebar({ user, persona, onPersonaChange, onLogout }) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-800 bg-gray-900/60 backdrop-blur-sm p-5 overflow-y-auto">
      {/* User */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-lg">
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{user.username}</p>
          <p className="text-gray-500 text-xs">{persona}</p>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-5 mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Focus Area</p>
        <div className="space-y-1">
          {PERSONAS.map(p => (
            <button
              key={p}
              onClick={() => onPersonaChange(p)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                persona === p
                  ? 'bg-brand-500/20 text-brand-400 font-semibold'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800 pt-5 mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Score Legend</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><span className="badge-revolutionary">🔥 15+</span><span className="text-gray-400">Revolutionary</span></div>
          <div className="flex items-center gap-2"><span className="badge-highimpact">📈 10-14</span><span className="text-gray-400">High Impact</span></div>
          <div className="flex items-center gap-2"><span className="badge-trending">⚡ &lt;10 new</span><span className="text-gray-400">Trending</span></div>
          <div className="flex items-center gap-2"><span className="badge-standard">📄 &lt;10</span><span className="text-gray-400">Standard</span></div>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-5 mb-5 text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-400">How scoring works</p>
        <p>Papers are ranked by <strong className="text-gray-300">Keyword Relevance</strong> + <strong className="text-gray-300">Persona-weighted Quality</strong> + <strong className="text-gray-300">Trending Bonus</strong>.</p>
        <p>A great paper always scores high — persona only re-orders, never collapses quality.</p>
      </div>

      <button onClick={onLogout} className="btn-ghost mt-auto text-sm w-full text-left">
        ← Logout
      </button>
    </aside>
  )
}
