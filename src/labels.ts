import type { TFn } from './hooks'
import type { LoadItem } from './engine/types'
import type { RefrigerantMeta } from './engine/refrigerants'

// Load item label: the i18n key plus an optional suffix such as the façade orientation.
export function itemLabel(i: LoadItem, t: TFn): string {
  const base = t(i.labelKey)
  return i.label ? `${base} ${i.label}` : base
}

// Fluids with a common name (ammonia, propane...) get it in the UI language; the rest are just R-numbers.
export function fluidName(meta: RefrigerantMeta, t: TFn): string {
  const key = `fluid.${meta.id}`
  const name = t(key)
  return name === key ? meta.name : name
}
