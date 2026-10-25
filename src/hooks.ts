import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from './state/store'
import { translate } from './i18n'
import { fmt, toDisplay, unitLabel, type Quantity } from './units'
import { loadFluid, type Fluid } from './engine/props'
import { computeLoad } from './engine/hvac'
import { computeEquipment } from './engine/equipment'
import type { CycleResult, EquipmentResult, LoadResult, Scenario } from './engine/types'

export type TFn = (key: string, value?: number | string) => string

export function useT(): TFn {
  const lang = useStore((s) => s.lang)
  return useCallback((key: string, value?: number | string) => translate(lang, key, value), [lang])
}

export function useUnits() {
  const sys = useStore((s) => s.units)
  const lang = useStore((s) => s.lang)
  return useMemo(
    () => ({
      sys,
      // converted value with its unit label
      show: (q: Quantity, v: number, digits = 1) => `${fmt(toDisplay(q, v, sys), digits, lang)} ${unitLabel(q, sys)}`,
      // converted value only
      val: (q: Quantity, v: number, digits = 1) => fmt(toDisplay(q, v, sys), digits, lang),
      label: (q: Quantity) => unitLabel(q, sys),
      n: (v: number, digits = 1) => fmt(v, digits, lang),
    }),
    [sys, lang],
  )
}

interface FluidsState {
  fluids: Record<string, Fluid> | null
  error: string | null
}

// Loads the property tables for the requested refrigerants on demand.
export function useFluids(ids: string[]): FluidsState {
  const key = ids.slice().sort().join('|')
  const [state, setState] = useState<FluidsState>({ fluids: null, error: null })
  useEffect(() => {
    let alive = true
    const list = key ? key.split('|') : []
    Promise.all(list.map((id) => loadFluid(id)))
      .then((fs) => alive && setState({ fluids: Object.fromEntries(list.map((id, i) => [id, fs[i]])), error: null }))
      .catch((e: unknown) => alive && setState({ fluids: null, error: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [key])
  return state
}

export interface Computed {
  load: LoadResult
  equipment: EquipmentResult
  cycle: CycleResult | null
  cycleError: string | null
  loading: boolean
  fluids: Record<string, Fluid> | null
}

export function computeAll(sc: Scenario, fluids: Record<string, Fluid> | null): Omit<Computed, 'loading' | 'fluids'> {
  const load = computeLoad(sc)
  const fluid = fluids?.[sc.equipment.refrigerant] ?? null
  const { result, cycle, cycleError } = computeEquipment(sc, load, fluid)
  return { load, equipment: result, cycle, cycleError }
}

export function useComputed(sc: Scenario): Computed {
  const ids = useMemo(() => [sc.equipment.refrigerant], [sc.equipment.refrigerant])
  const { fluids, error } = useFluids(ids)
  return useMemo(() => {
    const r = computeAll(sc, fluids)
    return { ...r, cycleError: r.cycleError ?? error, loading: !fluids && !error, fluids }
  }, [sc, fluids, error])
}

// Charts re-render with matching colors when the theme changes.
export function useTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => currentTheme())
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(currentTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

export function currentTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
