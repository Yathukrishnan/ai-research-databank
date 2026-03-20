const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  login: (username, password) => req('/auth/login', { username, password }),
  register: (username, password, persona) => req('/auth/register', { username, password, persona }),
  search: (query, persona) => req('/papers/search', { query, persona }),
  related: (author_id, s2_id) => req('/papers/related', { author_id, s2_id }),
}
