import { Dialog as D, Popover as P } from 'radix-ui'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * A bottom sheet below 1024 px and a centred dialog above, one component for both, so a picker or a confirm reads
 * the same way on the phone and the desk.
 */
export function Sheet({ open, onOpenChange, title, description, children, tag, wide = false }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  tag?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-ink/40 animate-[fade-in_.15s_ease-out]" />
        <D.Content
          className={`fixed inset-x-0 bottom-0 z-40 max-h-[88dvh] overflow-auto rounded-t-[20px] bg-chalk px-4 pt-3 pb-8 outline-none animate-[sheet-in_.22s_cubic-bezier(.2,.7,.2,1)]
            desk:inset-x-auto desk:top-1/2 desk:bottom-auto desk:left-1/2 desk:w-[calc(100vw-48px)] desk:-translate-x-1/2 desk:-translate-y-1/2 desk:rounded-[16px] desk:p-6 desk:animate-[pop-in_.18s_ease-out]
            ${wide ? 'desk:max-w-[560px]' : 'desk:max-w-[440px]'}`}
        >
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-line-strong desk:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            {tag ? <span className="tag">{tag}</span> : <span />}
            <D.Close className="icon-btn -my-2 -mr-2" aria-label="Close"><Icon name="close" /></D.Close>
          </div>
          <D.Title className="disp mt-1 text-[36px]">{title}</D.Title>
          {description ? <D.Description className="muted mt-1">{description}</D.Description> : <D.Description className="sr-only">{typeof title === 'string' ? title : 'Details'}</D.Description>}
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

export function Menu({ trigger, children, label }: { trigger: ReactNode; children: ReactNode; label: string }) {
  return (
    <P.Root>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align="end" sideOffset={6} aria-label={label}
          className="z-30 grid min-w-[200px] rounded-[12px] border border-line bg-card p-1.5 text-ink shadow-pop outline-none animate-[pop-in_.14s_ease-out]"
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}

export function MenuItem({ icon, children, onSelect }: { icon: Parameters<typeof Icon>[0]['name']; children: ReactNode; onSelect: () => void }) {
  return (
    <P.Close asChild>
      <button className="flex h-11 items-center gap-2.5 rounded-[8px] px-2.5 text-left font-medium hover:bg-soft" onClick={onSelect}>
        <Icon name={icon} />
        {children}
      </button>
    </P.Close>
  )
}
