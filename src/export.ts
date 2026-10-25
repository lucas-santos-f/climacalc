// CSV export of the current scenario. Separators follow the UI language so the file opens
// cleanly in a spreadsheet using that locale (pt-BR expects ';' and decimal commas).
import type { Computed, TFn } from './hooks'
import type { Scenario } from './engine/types'
import type { Lang } from './i18n'
import { downloadBlob, safeFileName } from './state/store'
import { itemLabel } from './labels'

function csvCell(v: string | number, lang: Lang, sep: string): string {
  const s = typeof v === 'number' ? v.toLocaleString(lang, { maximumFractionDigits: 3, useGrouping: false }) : v
  return s.includes(sep) || /["\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(sc: Scenario, c: Computed, t: TFn, lang: Lang = 'en'): string {
  const rows: (string | number)[][] = []
  const L = c.load
  const E = c.equipment
  rows.push([t('scenario.title'), sc.name])
  rows.push([t('scenario.environment'), t(`environment.${sc.environment}`)])
  rows.push([t('room.floorArea') + ' (m²)', L.geometry.floorArea])
  rows.push([])
  rows.push([t('load.results')])
  rows.push([t('load.item'), t('load.sensible') + ' (W)', t('load.latent') + ' (W)'])
  for (const i of L.items) rows.push([itemLabel(i, t), i.sensible, i.latent])
  rows.push([t('load.room_total') + ' (W)', L.roomSensible, L.roomLatent])
  rows.push([t('load.oa_total') + ' (W)', L.outdoorSensible, L.outdoorLatent])
  rows.push([t('load.coil_total') + ' (W)', L.coilTotal])
  rows.push([t('load.capacity') + ' (kW)', L.capacityKW])
  rows.push([t('load.shr'), L.shrRoom])
  rows.push([t('load.w_per_m2'), L.wPerM2])
  rows.push([])
  rows.push([t('air.title')])
  rows.push([t('air.supply_flow') + ' (m³/h)', L.air.supplyM3h])
  rows.push([t('air.oa_flow') + ' (m³/h)', L.air.outdoorM3h])
  rows.push([t('air.t_supply') + ' (°C)', L.air.tSupply])
  rows.push([t('air.adp') + ' (°C)', L.air.adp ?? ''])
  rows.push([t('air.bypass'), L.air.bypassFactor ?? ''])
  for (const s of L.air.states) rows.push([t(`air.state.${s.id}`), `T ${s.T.toFixed(1)} °C`, `W ${(s.W * 1000).toFixed(2)} g/kg`, `RH ${(s.RH * 100).toFixed(0)} %`, `h ${s.h.toFixed(1)} kJ/kg`])
  rows.push([])
  rows.push([t('eq.results'), t(`eq.system.${E.system}`), sc.equipment.refrigerant])
  rows.push([t('eq.unit_size'), E.units.unitLabel, E.units.unitKW])
  rows.push([t('eq.operating'), E.units.operating])
  rows.push([t('eq.installed'), E.units.installed])
  rows.push([t('eq.cop_nominal'), E.cop.nominal])
  rows.push([t('eq.cop_cycle'), E.cop.cycle ?? ''])
  rows.push([t('eq.totalKW') + ' (kW)', E.electrical.totalKW])
  rows.push([t('eq.kVA') + ' (kVA)', E.electrical.kVA])
  rows.push([t('eq.amps') + ' (A)', E.electrical.amps])
  rows.push([t('eq.kWPerTR'), E.electrical.kWPerTR])
  rows.push([t('eq.charge') + ' (kg)', E.refrigerant.chargeKg])
  rows.push([t('eq.co2e') + ' (t)', E.refrigerant.co2eTon])
  const sep = lang === 'pt-BR' ? ';' : ','
  return '﻿' + rows.map((r) => r.map((v) => csvCell(v, lang, sep)).join(sep)).join('\r\n')
}

export function exportCsv(sc: Scenario, c: Computed, t: TFn, lang: Lang): void {
  downloadBlob(new Blob([buildCsv(sc, c, t, lang)], { type: 'text/csv;charset=utf-8' }), `${safeFileName(sc.name)}.csv`)
}
