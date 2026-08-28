import { useState, type ReactNode } from 'react'
import { Button, Card } from '../components/ui'
import { useAuth } from './AuthContext'

function NotConfigured() {
  return (
    <Card className="flex flex-col gap-3 text-left">
      <h2 className="text-lg font-bold">🔌 Online-Modus noch nicht eingerichtet</h2>
      <p className="text-sm text-white/70">
        Für Accounts &amp; die Weekend League braucht die App ein Supabase-Projekt. Erstelle
        kostenlos eines auf{' '}
        <span className="font-semibold text-white">supabase.com</span>, führe{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5">supabase/schema.sql</code> im
        SQL-Editor aus und trage <code className="rounded bg-black/30 px-1.5 py-0.5">
          VITE_SUPABASE_URL
        </code>{' '}
        sowie{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> in eine{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5">.env</code>-Datei ein (siehe{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5">.env.example</code>).
      </p>
    </Card>
  )
}

function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      const { error, needsConfirmation } = await signUp(email, password, username)
      if (error) setError(error)
      else if (needsConfirmation)
        setInfo('Bestätige deine E-Mail über den Link, den wir dir geschickt haben, und melde dich danach an.')
    }
    setBusy(false)
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${mode === 'signin' ? 'bg-violet-500' : 'bg-white/10 text-white/60'}`}
        >
          Anmelden
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-violet-500' : 'bg-white/10 text-white/60'}`}
        >
          Registrieren
        </button>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Anzeigename"
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-violet-400"
          />
        )}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-violet-400"
        />
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-violet-400"
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {info && <p className="text-sm text-emerald-400">{info}</p>}
        <Button type="submit" disabled={busy}>
          {mode === 'signin' ? 'Anmelden' : 'Account erstellen'}
        </Button>
      </form>
    </Card>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, user } = useAuth()

  if (!configured) return <NotConfigured />
  if (loading) return <p className="text-center text-white/50">Lädt…</p>
  if (!user) return <AuthForm />
  return <>{children}</>
}
