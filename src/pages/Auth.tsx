import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { XlviLoader } from 'react-awesome-loaders'
import { useAuth } from '../context/AuthContext'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: Location } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const ageNumber = age ? Number(age) : 0
        await signUp({
          name: name.trim(),
          age: Number.isFinite(ageNumber) ? ageNumber : 0,
          email: email.trim(),
          password,
        })
      } else {
        await signIn(email.trim(), password)
      }
      const dest = location.state?.from?.pathname ?? '/'
      navigate(dest, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Could not sign in. Please check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await signInWithGoogle()
      const dest = location.state?.from?.pathname ?? '/'
      navigate(dest, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Google sign-in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-6 shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Expense Tracker
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Sign {mode === 'signin' ? 'in to see' : 'up to save'} your expenses
            securely in the cloud.
          </p>
        </div>

        <div className="flex rounded-xl bg-[var(--surface-hover)] p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'signin'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)]'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Age
                </label>
                <input
                  type="number"
                  min={0}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
                  placeholder="Optional"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
              placeholder="At least 6 characters"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {submitting ? (
              <>
                <XlviLoader boxColors={['#fff']} desktopSize="24px" mobileSize="20px" />
                <span>
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </span>
              </>
            ) : mode === 'signin' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">or</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {submitting ? (
            <>
              <XlviLoader boxColors={['var(--accent)']} desktopSize="24px" mobileSize="20px" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in with Google</span>
          )}
        </button>
      </div>
    </div>
  )
}

