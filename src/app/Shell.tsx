import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { RUNNER } from '@/domain/seed'
import { Mark } from '@/ui/Bend'
import { Icon, type IconName } from '@/ui/Icon'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/plan', label: 'Plan', icon: 'plan' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/you', label: 'You', icon: 'you' },
]

const DESK = '(min-width: 1024px)'
/** Below 1024 px the app is the phone layout; from 1024 up, a sidebar and two columns. */
export function useDesk() {
  const [desk, setDesk] = useState(() => matchMedia(DESK).matches)
  useEffect(() => {
    const mq = matchMedia(DESK), on = () => setDesk(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desk
}
const DeskCtx = createContext(false)
export const useIsDesk = () => useContext(DeskCtx)

const Lockup = ({ size = 28 }: { size?: number }) => (
  <Link to="/" className="flex items-center gap-[9px] rounded-[6px]" aria-label="Racecraft, Today">
    <Mark size={size} />
    <span className="disp text-[22px]">Racecraft</span>
  </Link>
)
const Avatar = () => <span className="grid size-[34px] place-items-center rounded-full bg-soft text-[13px] font-semibold" aria-hidden>{RUNNER.initials}</span>

export function Shell() {
  const desk = useDesk()
  const { pathname } = useLocation()
  useEffect(() => {
    const tab = TABS.find((t) => t.to !== '/' && pathname.startsWith(t.to))?.label ?? (pathname === '/' ? 'Today' : pathname.startsWith('/workout') ? 'Workout' : 'Not found')
    document.title = `${tab} · Racecraft`
  }, [pathname])

  return (
    <DeskCtx.Provider value={desk}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-[6px] focus:bg-ink focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      {desk ? (
        <div className="grid min-h-dvh grid-cols-[232px_1fr] bg-canvas">
          <div className="border-r border-line bg-chalk">
          <aside className="sticky top-0 flex h-dvh flex-col gap-7 px-4 py-[22px]">
            <Lockup />
            <nav aria-label="Main" className="grid gap-0.5">
              {TABS.map((t) => (
                <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[8px] px-2.5 py-[9px] text-[15px] ${isActive ? 'bg-soft font-semibold text-ink [&_svg]:text-red' : 'text-muted hover:text-ink'}`}>
                  <Icon name={t.icon} />{t.label}
                </NavLink>
              ))}
            </nav>
            <Link to="/you" className="mt-auto flex items-center gap-2.5 rounded-[8px] text-[13px] text-muted">
              <Avatar />
              <span><b className="block text-[14px] font-semibold text-ink">{RUNNER.fullName}</b>{RUNNER.city}</span>
            </Link>
          </aside>
          </div>
          <main id="main" className="w-full max-w-[1200px] px-10 pt-8 pb-20">
            <Outlet />
          </main>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between px-4 pt-4 pb-2">
            <Lockup />
            <Link to="/you" className="rounded-full"><Avatar /><span className="sr-only">You</span></Link>
          </header>
          <main id="main" className="mx-auto grid max-w-[520px] gap-3 px-4 pt-1 pb-[120px]">
            <Outlet />
          </main>
          <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-chalk px-2 pt-2 pb-[max(24px,env(safe-area-inset-bottom))]">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) =>
                `grid justify-items-center gap-[3px] rounded-[8px] py-0.5 text-[12px] ${isActive ? 'font-semibold text-ink [&_svg]:text-red' : 'text-muted'}`}>
                <Icon name={t.icon} />{t.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
      <ScrollRestoration />
    </DeskCtx.Provider>
  )
}

/** A page's head: the date line and the title in Big Shoulders, with room on the right at 1440. */
export function PageHead({ kicker, title, aside }: { kicker?: ReactNode; title: ReactNode; aside?: ReactNode }) {
  const desk = useIsDesk()
  return (
    <div className={desk ? 'mb-5 flex items-end justify-between gap-6' : 'pt-1 pb-0.5'}>
      <div>
        {kicker && <p className="muted text-[14px]">{kicker}</p>}
        {/* The display face sets at 0.95 line height, so room is left above for the accent on "LUÍSA". */}
        <h1 className={`disp ${desk ? 'mt-1.5 text-[48px]' : 'mt-1 text-[34px]'}`}>{title}</h1>
      </div>
      {aside}
    </div>
  )
}
