import type { TFn } from './hooks'
import type { LoadItem } from './engine/types'

/** Rótulo de uma parcela da carga: chave i18n + complemento (orientação). */
export function itemLabel(i: LoadItem, t: TFn): string {
  const base = t(i.labelKey)
  return i.label ? `${base} ${i.label}` : base
}
