import { XlviLoader } from 'react-awesome-loaders'

export function AppLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <XlviLoader
        boxColors={['var(--accent)', '#F59E0B', '#6366F1']}
        desktopSize="80px"
        mobileSize="60px"
      />
      <span className="text-sm text-[var(--text-muted)]">Loading...</span>
    </div>
  )
}
