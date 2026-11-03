import { Toast as T } from 'radix-ui'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Item { id: number; message: string; undo?: () => void }
const Ctx = createContext<(t: Omit<Item, 'id'>) => void>(() => {})

export const useToast = () => useContext(Ctx)

/** One toast at a time: a new one replaces the last, as each action's result supersedes the one before. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<Item | null>(null)
  const show = useCallback((t: Omit<Item, 'id'>) => setItem({ ...t, id: Date.now() }), [])
  return (
    <T.Provider duration={5000} swipeDirection="down" label="Notification">
      <Ctx.Provider value={show}>{children}</Ctx.Provider>
      {item && (
        <T.Root
          key={item.id}
          onOpenChange={(open) => !open && setItem(null)}
          className="on-ink flex max-w-[560px] items-center gap-4 rounded-[10px] bg-ink px-4 py-2.5 text-[14px] text-white shadow-toast data-[state=open]:animate-[pop-in_.18s_ease-out]"
        >
          <T.Description className="min-w-0">{item.message}</T.Description>
          {item.undo && (
            <T.Action altText="Undo" asChild>
              <button className="-my-1 shrink-0 py-1 font-semibold text-red-on-ink" onClick={item.undo}>Undo</button>
            </T.Action>
          )}
        </T.Root>
      )}
      <T.Viewport className="fixed inset-x-4 bottom-[96px] z-50 flex flex-col items-center outline-none desk:bottom-7" />
    </T.Provider>
  )
}
