// Seleção de equipamento, demanda elétrica, água, fluido refrigerante e espaço para a central.
import type { CycleInput, CycleResult, EquipmentResult, HvacSystem, LoadResult, Scenario, Warning } from './types'
import { refrigerantMeta } from './refrigerants'
import { computeCycle } from './cycle'
import type { Fluid } from './props'

export const STD_TRANSFORMERS_KVA = [15, 30, 45, 75, 112.5, 150, 225, 300, 400, 500, 630, 750, 1000, 1250, 1500, 2000, 2500, 3000]
const TR = 3.51685

export interface SystemPreset {
  id: HvacSystem
  cop: number // nominal (kW_frio / kW_el do compressor + condensador)
  copLabel: string
  sizesKW: number[]
  sizeLabel: (kw: number) => string
  indoorUnitKW: number
  sfp: number // kW por m³/s de ar insuflado (ventiladores dos lados do ar)
  chwPump: number // kW por kW_frio
  cwPump: number
  tower: number
  chargeKgPerKW: number
  tEvap: number // °C evaporação típica (DX) — chillers usam chwSupply − 3
  condenserAir: boolean
  indoorPlant: boolean // casa de máquinas interna
  refrigerants: string[]
}

const kbtu = (list: number[]) => list.map((k) => (k * 1000) / 3412.142)
export const SYSTEM_PRESETS: Record<HvacSystem, SystemPreset> = {
  split: { id: 'split', cop: 3.4, copLabel: 'ISO 5151 / Inverter', sizesKW: kbtu([9, 12, 18, 24, 30, 36, 48, 60]), sizeLabel: (kw) => `${Math.round((kw * 3412.142) / 1000)} kBTU/h`, indoorUnitKW: 0, sfp: 0, chwPump: 0, cwPump: 0, tower: 0, chargeKgPerKW: 0.35, tEvap: 8, condenserAir: true, indoorPlant: false, refrigerants: ['R32', 'R410A', 'R290', 'R454B'] },
  vrf: { id: 'vrf', cop: 4.0, copLabel: 'nominal (EER)', sizesKW: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60].map((hp) => hp * 2.8), sizeLabel: (kw) => `${Math.round(kw / 2.8)} HP`, indoorUnitKW: 7.1, sfp: 0.3, chwPump: 0, cwPump: 0, tower: 0, chargeKgPerKW: 0.5, tEvap: 8, condenserAir: true, indoorPlant: false, refrigerants: ['R410A', 'R32', 'R454B'] },
  rooftop: { id: 'rooftop', cop: 3.0, copLabel: 'nominal (EER)', sizesKW: [5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60].map((t) => t * TR), sizeLabel: (kw) => `${Math.round((kw / TR) * 2) / 2} TR`, indoorUnitKW: 0, sfp: 1.2, chwPump: 0, cwPump: 0, tower: 0, chargeKgPerKW: 0.4, tEvap: 8, condenserAir: true, indoorPlant: false, refrigerants: ['R410A', 'R454B', 'R32', 'R290'] },
  chiller_air: { id: 'chiller_air', cop: 3.0, copLabel: 'plena carga (IPLV ≈ 4,5)', sizesKW: [30, 50, 80, 100, 150, 200, 250, 300, 400, 500].map((t) => t * TR), sizeLabel: (kw) => `${Math.round(kw / TR)} TR`, indoorUnitKW: 10, sfp: 1.5, chwPump: 0.025, cwPump: 0, tower: 0, chargeKgPerKW: 0.3, tEvap: 4, condenserAir: true, indoorPlant: false, refrigerants: ['R134a', 'R513A', 'R1234ze(E)', 'R290', 'R454B', 'R32'] },
  chiller_water: { id: 'chiller_water', cop: 5.5, copLabel: 'plena carga (IPLV ≈ 7,5)', sizesKW: [100, 150, 200, 300, 400, 500, 700, 1000, 1500].map((t) => t * TR), sizeLabel: (kw) => `${Math.round(kw / TR)} TR`, indoorUnitKW: 10, sfp: 1.5, chwPump: 0.025, cwPump: 0.03, tower: 0.012, chargeKgPerKW: 0.25, tEvap: 4, condenserAir: false, indoorPlant: true, refrigerants: ['R134a', 'R513A', 'R1234ze(E)', 'R717', 'R1234yf'] },
}

/** Limite inferior de inflamabilidade (kg/m³) — IEC 60335-2-40 / ISO 817. */
const LFL: Record<string, number> = { R32: 0.307, R454B: 0.3, R454C: 0.291, R455A: 0.432, R1234yf: 0.289, 'R1234ze(E)': 0.303, R290: 0.038, R1270: 0.046, R600a: 0.043, R717: 0.116 }

function nextStd(list: number[], v: number): number {
  for (const s of list) if (s >= v) return s
  return Math.ceil(v / 100) * 100
}

/** Entrada do ciclo termodinâmico equivalente ao sistema escolhido. */
export function cycleInputFor(sc: Scenario, preset: SystemPreset): CycleInput {
  const e = sc.equipment
  const tEvap = preset.indoorPlant || preset.id === 'chiller_air' ? e.chwSupply - 3 : preset.tEvap
  const tCond = preset.condenserAir ? sc.site.tExt + e.condApproach : sc.site.twbExt + e.condApproach
  return {
    refrigerant: e.refrigerant,
    system: 'single',
    tEvap,
    tCond,
    superheat: e.superheat,
    subcooling: e.subcooling,
    compressorType: e.compressorType,
    etaIsOverride: null,
    etaVolOverride: null,
    motorEff: 0.93,
    tInter: null,
    cascade: { refrigerantHT: 'R717', tCascade: -8, dtCascade: 5 },
    transcritical: { tGasCoolerOut: sc.site.tExt + 3, pGasCooler: null },
  }
}

export function computeEquipment(sc: Scenario, load: LoadResult, fluid: Fluid | null): { result: EquipmentResult; cycle: CycleResult | null; cycleError: string | null } {
  const e = sc.equipment
  const preset = SYSTEM_PRESETS[e.system]
  const meta = refrigerantMeta(e.refrigerant)
  const warnings: Warning[] = []
  const cap = Math.max(load.capacityKW, 0.1)

  // ---------- ciclo de referência ----------
  let cycle: CycleResult | null = null
  let cycleError: string | null = null
  const ci = cycleInputFor(sc, preset)
  if (fluid) {
    try {
      cycle = computeCycle(ci, cap, { main: fluid })
    } catch (err) {
      cycleError = err instanceof Error ? err.message : 'generic'
    }
  }
  const copCycleEl = cycle ? cycle.COP * 0.93 * (preset.condenserAir ? 0.93 : 0.97) : null // motor + ventiladores do condensador
  const copNominal = e.copOverride ?? preset.cop
  const copUsed = copNominal

  // ---------- unidades ----------
  const suggested = e.system === 'split' ? Math.max(1, Math.ceil(cap / 14)) : e.system === 'vrf' ? Math.max(1, Math.ceil(cap / 56)) : e.system === 'rooftop' ? Math.max(1, Math.ceil(cap / 70)) : Math.max(1, Math.min(4, Math.ceil(cap / 700)))
  const n = Math.max(1, Math.round(e.nUnits ?? suggested))
  const unitKW = nextStd(preset.sizesKW, cap / n)
  const installed = n + (e.standby ? 1 : 0)
  const indoorUnits = preset.indoorUnitKW > 0 ? Math.max(1, Math.ceil(cap / preset.indoorUnitKW)) : n
  if (unitKW > preset.sizesKW[preset.sizesKW.length - 1]) warnings.push({ key: 'warn.unit_too_large' })
  if (cap / n < preset.sizesKW[0] * 0.5 && n > 1) warnings.push({ key: 'warn.too_many_units' })

  // ---------- elétrica ----------
  const compressorsKW = cap / copUsed
  const supplyM3s = load.air.supplyM3h / 3600
  const fansKW = supplyM3s * preset.sfp + (e.system === 'split' ? cap * 0.02 : 0)
  const pumpsKW = cap * (preset.chwPump + preset.cwPump)
  const towerKW = cap * preset.tower
  const totalKW = compressorsKW + fansKW + pumpsKW + towerKW
  const pf = Math.min(1, Math.max(0.6, e.powerFactor))
  const kVA = totalKW / pf
  const amps = (kVA * 1000) / (Math.sqrt(3) * Math.max(200, e.voltage))
  const transformerKVA = nextStd(STD_TRANSFORMERS_KVA, kVA * 1.25)
  const kWhDay = totalKW * sc.operation.hoursPerDay * 0.65 // carga média ≈ 65 % do pico

  // ---------- água ----------
  const heatRejectionKW = cap + compressorsKW
  const water: EquipmentResult['water'] = { heatRejectionKW }
  if (e.system === 'chiller_air' || e.system === 'chiller_water') water.chwFlowM3h = (cap / (4.186 * Math.max(2, e.chwDeltaT))) * 3.6
  if (e.system === 'chiller_water') {
    water.cwFlowM3h = (heatRejectionKW / (4.186 * 5)) * 3.6
    water.makeupM3h = (heatRejectionKW / 2450) * 3.6 * 1.4
  }

  // ---------- fluido e segurança ----------
  const chargeKgPerKW = e.chargeKgPerKW ?? preset.chargeKgPerKW
  const chargeKg = chargeKgPerKW * unitKW * n
  const chargePerCircuitKg = e.system === 'vrf' ? chargeKgPerKW * unitKW : chargeKgPerKW * unitKW
  const co2eTon = (chargeKg * meta.gwpAR4) / 1000
  let roomChargeLimitKg: number | null = null
  const lfl = LFL[e.refrigerant]
  if (lfl && (e.system === 'split' || e.system === 'vrf')) {
    // IEC 60335-2-40 / NBR 16655: m_max = 2,5 · LFL^(5/4) · h0 · √A  (h0 = 2,2 m unidade no teto)
    roomChargeLimitKg = 2.5 * Math.pow(lfl, 1.25) * 2.2 * Math.sqrt(Math.max(1, load.geometry.floorArea))
    if (chargePerCircuitKg > roomChargeLimitKg) warnings.push({ key: 'warn.room_charge_limit', value: roomChargeLimitKg })
  }
  if (meta.safety === 'A3' && e.system !== 'chiller_air' && e.system !== 'chiller_water') warnings.push({ key: 'warn.a3_indoor' })
  if (meta.safety === 'B2L') warnings.push({ key: 'warn.b2l_hvac' })
  if (meta.gwpAR4 >= 2000) warnings.push({ key: 'warn.gwp_high', value: meta.gwpAR4 })
  if (meta.legacy) warnings.push({ key: 'warn.legacy_fluid' })
  if (!preset.refrigerants.includes(e.refrigerant)) warnings.push({ key: 'warn.refrigerant_unusual' })
  if (cycle && cycle.stages[0].Tdischarge - 273.15 > 110) warnings.push({ key: 'warn.discharge_high', value: cycle.stages[0].Tdischarge - 273.15 })
  const ventilationEmergencyM3h = preset.indoorPlant ? 70 * Math.sqrt(Math.max(chargeKg, 1)) * 3.6 : null

  // ---------- espaço ----------
  const indoorAreaM2 = preset.indoorPlant ? Math.round((15 + 0.08 * cap) * 1.25) : e.system === 'chiller_air' ? Math.round(8 + 0.02 * cap) : null
  const outdoorAreaM2 = e.system === 'split' ? installed * 0.6 : e.system === 'chiller_water' ? Math.round(0.03 * heatRejectionKW + 6) : Math.round(installed * (2 + 0.04 * unitKW))

  if (!e.standby && (sc.environment === 'hospital_room' || sc.environment === 'server_room')) warnings.push({ key: 'warn.no_redundancy_critical' })

  return {
    result: {
      system: e.system,
      capacityKW: cap,
      units: { operating: n, installed, unitKW, unitLabel: preset.sizeLabel(unitKW), indoorUnits, indoorUnitKW: preset.indoorUnitKW },
      cop: { nominal: copNominal, cycle: copCycleEl, usedForPower: copUsed, tEvap: ci.tEvap, tCond: ci.tCond },
      electrical: { compressorsKW, fansKW, pumpsKW, towerKW, totalKW, kVA, amps, transformerKVA, kWPerTR: totalKW / (cap / TR), kWhDay },
      water,
      refrigerant: { chargeKg, chargeKgPerKW, co2eTon, roomChargeLimitKg, chargePerCircuitKg, ventilationEmergencyM3h },
      space: { indoorAreaM2, outdoorAreaM2 },
      warnings,
    },
    cycle,
    cycleError,
  }
}
