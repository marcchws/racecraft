import { Select as S } from 'radix-ui'
import { Icon } from './Icon'

export function Select<T extends string>({ value, onChange, options, label, id, placeholder, invalid }: {
  value: T | null
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  id?: string
  placeholder?: string
  invalid?: boolean
}) {
  return (
    <S.Root value={value ?? undefined} onValueChange={(v) => onChange(v as T)}>
      <S.Trigger id={id} aria-label={label} aria-invalid={invalid || undefined} className="input flex items-center justify-between text-left data-[placeholder]:text-muted">
        <S.Value placeholder={placeholder ?? 'Choose'} />
        <S.Icon><Icon name="chevron" size={16} className="rotate-90" /></S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={4} className="z-50 min-w-[var(--radix-select-trigger-width)] rounded-[12px] border border-line bg-card p-1.5 shadow-pop">
          <S.Viewport>
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 outline-none data-[highlighted]:bg-soft">
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator><Icon name="check" size={16} /></S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  )
}
