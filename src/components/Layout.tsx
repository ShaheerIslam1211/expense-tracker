import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useUISettings } from '../context/UISettingsContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/add', label: 'Add', icon: '➕' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/fuel', label: 'Fuel', icon: '⛽' },
  { to: '/insights', label: 'Insights', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const { navPosition, navColor, navFixed } = useUISettings()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const rootPadding =
    navPosition === 'bottom'
      ? 'min-h-screen flex flex-col pb-24 safe-bottom md:pb-0'
      : 'min-h-screen flex flex-col'

  const bottomNavBaseClasses =
    'fixed bottom-0 left-0 right-0 safe-bottom md:relative md:mt-4'

  const navBgClasses =
    navColor === 'accent'
      ? 'bg-[var(--accent)] border-[var(--accent-dim)]'
      : 'bg-[var(--surface)] border-[var(--border)]'

  const linkClasses = (isActive: boolean) => {
    if (navColor === 'accent') {
      return [
        'flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl text-sm transition-colors',
        isActive
          ? 'bg-black/10 text-white'
          : 'text-white/80 hover:bg-black/10',
      ].join(' ')
    }
    return [
      'flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl text-sm transition-colors',
      isActive
        ? 'bg-[var(--accent)] text-white'
        : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]',
    ].join(' ')
  }

  const navContent = (
    <div className="max-w-4xl mx-auto flex justify-around md:justify-between py-2">
      {nav.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => linkClasses(isActive)}
        >
          <span className="text-lg">{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </NavLink>
      ))}
    </div>
  )

  const headerPositionClasses =
    navPosition === 'top' && navFixed
      ? 'sticky top-0 z-20'
      : 'relative z-10'

  return (
    <div className={rootPadding}>
      <header
        className={`${headerPositionClasses} bg-[var(--surface)] border-b border-[var(--border)] safe-top`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            Expense Tracker
          </h1>
          {navPosition === 'top' && (
            <button
              type="button"
              className="md:hidden p-2 rounded-lg bg-[var(--surface-hover)]"
              aria-label="Toggle navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
        {navPosition === 'top' && (
          <nav
            className={`${navBgClasses} border-t md:border-t-0 ${
              mobileNavOpen ? 'block' : 'hidden'
            } md:block`}
          >
            {navContent}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4">
        <Outlet />
      </main>

      {navPosition === 'bottom' && (
        <nav className={`${bottomNavBaseClasses} ${navBgClasses}`}>
          {navContent}
        </nav>
      )}
    </div>
  )
}

