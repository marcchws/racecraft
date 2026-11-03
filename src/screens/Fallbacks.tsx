import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Mark } from '@/ui/Bend'
import { SceneCard } from './shared'

export function NotFound() {
  return (
    <div className="desk:max-w-[560px] desk:pt-10">
      <SceneCard scene="broken" title="Off the track" headingLevel={1} actions={<Link to="/" className="btn btn-primary">Back to today</Link>}>
        There's no page at this address. Your plan is where you left it.
      </SceneCard>
    </div>
  )
}

/** The error boundary: anything that breaks while drawing a screen lands here, outside the shell. */
export function ErrorPage() {
  const error = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404
  return (
    <div className="min-h-dvh bg-canvas px-4 py-6">
      <Link to="/" className="mx-auto flex max-w-[560px] items-center gap-[9px]" aria-label="Racecraft, Today"><Mark /><span className="disp text-[22px]">Racecraft</span></Link>
      <main className="mx-auto mt-6 max-w-[560px]">
        <SceneCard scene="broken" title={missing ? 'Off the track' : 'Something broke'} headingLevel={1}
          actions={<><button className="btn btn-primary" onClick={() => location.assign('/')}>Reload Racecraft</button><Link to="/you" className="btn" reloadDocument>Reset the demo</Link></>}>
          {missing ? "There's no page at this address." : 'This screen hit an error and stopped. Your plan and runs are safe. Reload to start again.'}
        </SceneCard>
      </main>
    </div>
  )
}
