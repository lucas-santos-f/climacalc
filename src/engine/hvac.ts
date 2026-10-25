// Air-conditioning load (simplified ASHRAE Fundamentals CLTD/SCL/CLF method, NBR 16401) and supply air psychrometrics.
import type { AirResult, AirState, LoadGroup, LoadItem, LoadResult, Orientation, Scenario, Warning } from './types'
import { ACTIVITIES, ROOF_CLTD, SHGF, WALL_CLTD } from './presets'
import { dewPoint, enthalpy, moistAir, wSat, wetBulb } from './psychro'

const MASS_FACTOR = { light: 1.2, medium: 1.0, heavy: 0.8 }
const COLOR_FACTOR = { light: 0.65, medium: 0.83, dark: 1.0 }
const GLASS_CLF = 0.85
const H_FG = 2501 // kJ/kg

/** Standard atmospheric pressure (kPa) at altitude z (m). */
export function pressureAtAltitude(z: number): number {
  return 101.325 * Math.pow(1 - 2.25577e-5 * Math.max(0, Math.min(z, 8000)), 5.2559)
}

function airState(id: string, T: number, W: number, P: number): AirState {
  return { id, T, W, RH: moistAir(T, { w: W }, P).RH, h: enthalpy(T, W), Twb: wetBulb(T, W, P), Tdp: dewPoint(W, P) }
}

export function computeLoad(sc: Scenario): LoadResult {
  const { site, room, walls, roof, floor, internal, ventilation, operation } = sc
  const warnings: Warning[] = []
  const items: LoadItem[] = []
  const P = pressureAtAltitude(site.altitude)
  const out = moistAir(site.tExt, { twb: site.twbExt }, P)
  const inn = moistAir(site.tInt, { rh: site.rhInt / 100 }, P)
  const dT = site.tExt - site.tInt
  const floorArea = room.length * room.width
  const volume = floorArea * room.height
  const push = (key: string, labelKey: string, group: LoadGroup, sensible: number, latent = 0, detail?: string, label?: string) => {
    if (sensible <= 0 && latent <= 0) return
    items.push({ key, labelKey, label, group, sensible: Math.max(0, sensible), latent: Math.max(0, latent), detail })
  }

  const wallAreas = {} as Record<Orientation, number>
  const cltdCorr = 25.5 - site.tInt + (site.tExt - site.dailyRange / 2 - 29.4)
  let glassTotal = 0
  let wallTotal = 0
  for (const w of walls) {
    const facadeLen = w.orientation === 'N' || w.orientation === 'S' ? room.length : w.orientation === 'E' || w.orientation === 'W' ? room.width : Math.hypot(room.length, room.width) / 2
    const gross = w.areaOverride ?? facadeLen * room.height
    const glass = Math.min(Math.max(0, w.glassArea), gross)
    const opaque = Math.max(0, gross - glass)
    wallAreas[w.orientation] = gross
    glassTotal += glass
    wallTotal += gross
    if (w.exposed) {
      const cltd = Math.max(0, WALL_CLTD[w.orientation] * MASS_FACTOR[w.mass] * COLOR_FACTOR[w.color] + cltdCorr)
      push(`wall_${w.orientation}`, 'load.wall', 'envelope', w.uValue * opaque * cltd, 0, `${w.orientation} · ${opaque.toFixed(0)} m² · CLTD ${cltd.toFixed(1)} K`, w.orientation)
      if (glass > 0) {
        push(`glass_cond_${w.orientation}`, 'load.glass_cond', 'envelope', w.glassU * glass * Math.max(0, dT), 0, `${w.orientation} · ${glass.toFixed(0)} m²`, w.orientation)
        push(`glass_solar_${w.orientation}`, 'load.glass_solar', 'solar', glass * SHGF[w.orientation] * w.glassShgc * w.shading * GLASS_CLF, 0, `${w.orientation} · SHGF ${SHGF[w.orientation]} W/m² · SHGC ${w.glassShgc}`, w.orientation)
      }
    } else {
      push(`partition_${w.orientation}`, 'load.partition', 'envelope', w.uValue * gross * Math.max(0, dT * 0.5), 0, `${w.orientation} · ${gross.toFixed(0)} m²`, w.orientation)
    }
  }
  if (roof.exposed) {
    const cltd = Math.max(0, ROOF_CLTD * MASS_FACTOR[roof.mass] * COLOR_FACTOR[roof.color] + cltdCorr)
    push('roof', 'load.roof', 'envelope', roof.uValue * floorArea * cltd, 0, `${floorArea.toFixed(0)} m² · CLTD ${cltd.toFixed(1)} K`)
  } else {
    push('ceiling', 'load.ceiling', 'envelope', 1.5 * floorArea * Math.max(0, dT * 0.5), 0, `${floorArea.toFixed(0)} m²`)
  }
  if (floor.kind === 'unconditioned') push('floor', 'load.floor', 'envelope', floor.uValue * floorArea * Math.max(0, dT * 0.5))

  const people = internal.people ?? Math.round(floorArea / Math.max(0.3, internal.areaPerPerson))
  const act = ACTIVITIES[internal.activity]
  push('people', 'load.people', 'people', people * act.sensible * internal.diversityPeople, people * act.latent * internal.diversityPeople, `${people} × ${act.sensible}/${act.latent} W`)
  push('lights', 'load.lights', 'lights', internal.lightingWPerM2 * internal.lightingFactor * floorArea * internal.diversityLights)
  push('equipment', 'load.equipment', 'equipment', (internal.equipmentWPerM2 * floorArea + internal.equipmentKW * 1000) * internal.diversityEquipment)

  const massFlow = (m3h: number) => m3h / 3600 / out.v // kg dry air/s
  const cpMoist = 1.006 + 1.86 * out.W
  const sensOf = (m3h: number) => massFlow(m3h) * cpMoist * Math.max(0, dT) * 1000 // W
  const latOf = (m3h: number) => massFlow(m3h) * Math.max(0, out.W - inn.W) * H_FG * 1000 // W
  const infM3h = ventilation.infiltrationACH * volume
  push('infiltration', 'load.infiltration', 'infiltration', sensOf(infM3h), latOf(infM3h), `${infM3h.toFixed(0)} m³/h`)

  // fan heat picked up by the supply air
  const roomSensSoFar = items.reduce((a, i) => a + i.sensible, 0)
  push('fan', 'load.fan', 'fan', (roomSensSoFar * operation.fanHeatPct) / 100)

  // outdoor air is a coil load, not a room load
  let oaM3h: number
  if (ventilation.method === 'per_person_area') oaM3h = (people * ventilation.perPersonLs + floorArea * ventilation.perAreaLsM2) * 3.6
  else if (ventilation.method === 'ach') oaM3h = ventilation.achOutdoor * volume
  else oaM3h = ventilation.manualM3h
  const hr = Math.min(0.85, Math.max(0, ventilation.heatRecovery))
  push('outdoor_air', 'load.outdoor_air', 'outdoor_air', sensOf(oaM3h) * (1 - hr), latOf(oaM3h) * (1 - hr), `${oaM3h.toFixed(0)} m³/h${hr > 0 ? ` · rec. ${(hr * 100).toFixed(0)} %` : ''}`)

  const byGroup = { envelope: { sensible: 0, latent: 0 }, solar: { sensible: 0, latent: 0 }, people: { sensible: 0, latent: 0 }, lights: { sensible: 0, latent: 0 }, equipment: { sensible: 0, latent: 0 }, infiltration: { sensible: 0, latent: 0 }, outdoor_air: { sensible: 0, latent: 0 }, fan: { sensible: 0, latent: 0 } } as Record<LoadGroup, { sensible: number; latent: number }>
  for (const i of items) {
    byGroup[i.group].sensible += i.sensible
    byGroup[i.group].latent += i.latent
  }
  const roomItems = items.filter((i) => i.group !== 'outdoor_air')
  const roomSensible = roomItems.reduce((a, i) => a + i.sensible, 0)
  const roomLatent = roomItems.reduce((a, i) => a + i.latent, 0)
  const roomTotal = roomSensible + roomLatent
  const outdoorSensible = byGroup.outdoor_air.sensible
  const outdoorLatent = byGroup.outdoor_air.latent
  const coilTotal = roomTotal + outdoorSensible + outdoorLatent
  const safetyW = (coilTotal * operation.safetyFactor) / 100
  const capacityW = coilTotal + safetyW
  const shrRoom = roomTotal > 0 ? roomSensible / roomTotal : 1

  const air = computeAir(sc, { P, out, inn, roomSensible, roomLatent, oaM3h })

  const wPerM2 = floorArea > 0 ? capacityW / floorArea : 0
  if (shrRoom < 0.65) warnings.push({ key: 'warn.low_shr', value: shrRoom * 100 })
  if (wPerM2 > 300) warnings.push({ key: 'warn.high_density', value: wPerM2 })
  if (coilTotal > 0 && (outdoorSensible + outdoorLatent) / coilTotal > 0.45) warnings.push({ key: 'warn.oa_dominant', value: (100 * (outdoorSensible + outdoorLatent)) / coilTotal })
  if (wallTotal > 0 && glassTotal / wallTotal > 0.5) warnings.push({ key: 'warn.glass_ratio', value: (100 * glassTotal) / wallTotal })
  if (people > 0 && floorArea / people < 1) warnings.push({ key: 'warn.people_density' })
  warnings.push(...air.warnings)

  return {
    items,
    byGroup,
    roomSensible,
    roomLatent,
    roomTotal,
    outdoorSensible,
    outdoorLatent,
    coilTotal,
    safetyW,
    capacityW,
    capacityKW: capacityW / 1000,
    shrRoom,
    wPerM2,
    m2PerTR: capacityW > 0 ? floorArea / (capacityW / 3516.85) : 0,
    people,
    outdoorM3h: oaM3h,
    geometry: { floorArea, volume, wallAreas },
    air,
    outdoor: { T: out.T, W: out.W, h: out.h, P },
    indoor: { T: inn.T, W: inn.W, h: inn.h },
    energyKWhDay: 0,
    warnings,
  }
}

interface AirCtx {
  P: number
  out: ReturnType<typeof moistAir>
  inn: ReturnType<typeof moistAir>
  roomSensible: number
  roomLatent: number
  oaM3h: number
}

/** Supply airflow, mixed air, apparatus dew point (ADP) and bypass factor. */
export function computeAir(sc: Scenario, c: AirCtx): AirResult {
  const warnings: Warning[] = []
  const { P, out, inn } = c
  const dTs = Math.max(4, Math.min(20, sc.operation.supplyDeltaT))
  const tSupply = inn.T - dTs
  const rhoIn = 1 / inn.v // kg dry air/m³, close enough for the supply air
  const cp = 1.006 + 1.86 * inn.W
  // airflow that absorbs the room sensible load
  const supplyKgS = c.roomSensible > 0 ? c.roomSensible / 1000 / (cp * dTs) : 0
  const supplyM3h = (supplyKgS / rhoIn) * 3600
  // supply humidity ratio that absorbs the room latent load
  let wSupply = supplyKgS > 0 ? inn.W - c.roomLatent / 1000 / (supplyKgS * H_FG) : inn.W
  const wSatSupply = wSat(tSupply, P)
  if (wSupply > wSatSupply) {
    wSupply = wSatSupply
    warnings.push({ key: 'warn.supply_saturated' })
  }
  if (wSupply < 0) {
    wSupply = 0.95 * wSatSupply
    warnings.push({ key: 'warn.latent_too_high' })
  }
  const oaM3h = Math.min(c.oaM3h, supplyM3h > 0 ? supplyM3h : c.oaM3h)
  const outdoorFraction = supplyM3h > 0 ? oaM3h / supplyM3h : 1
  if (c.oaM3h > supplyM3h && supplyM3h > 0) warnings.push({ key: 'warn.oa_exceeds_supply' })
  // mixing by volume fraction, taken as the dry-air mass fraction
  const tMix = inn.T + outdoorFraction * (out.T - inn.T)
  const wMix = inn.W + outdoorFraction * (out.W - inn.W)
  const hMix = enthalpy(tMix, wMix)
  const hSupply = enthalpy(tSupply, wSupply)
  const coilKW = supplyKgS * (hMix - hSupply)
  const coilSens = supplyKgS * cp * (tMix - tSupply)
  const coilSHR = coilKW > 0 ? Math.min(1, coilSens / coilKW) : 1
  // ADP: where the mixed → supply line meets the saturation curve
  let adp: number | null = null
  let bypassFactor: number | null = null
  if (supplyKgS > 0 && tMix - tSupply > 0.1) {
    const slope = (wMix - wSupply) / (tMix - tSupply)
    let lo = -5
    let hi = tSupply
    const f = (T: number) => wSupply + slope * (T - tSupply) - wSat(T, P)
    if (f(hi) >= 0) adp = tSupply
    else if (f(lo) < 0) adp = null
    else {
      for (let i = 0; i < 50; i++) {
        const mid = 0.5 * (lo + hi)
        if (f(mid) >= 0) lo = mid
        else hi = mid
      }
      adp = 0.5 * (lo + hi)
    }
    if (adp !== null) {
      bypassFactor = Math.max(0, Math.min(0.5, (tSupply - adp) / (tMix - adp)))
      if (adp < 2) warnings.push({ key: 'warn.adp_low', value: adp })
    } else warnings.push({ key: 'warn.adp_none' })
  }
  const states: AirState[] = [airState('OA', out.T, out.W, P), airState('RA', inn.T, inn.W, P), airState('MA', tMix, wMix, P), airState('SA', tSupply, wSupply, P)]
  if (adp !== null) states.push(airState('ADP', adp, wSat(adp, P), P))
  const ach = c.roomSensible > 0 ? supplyM3h / Math.max(1, sc.room.length * sc.room.width * sc.room.height) : 0
  if (ach > 0 && ach < 4) warnings.push({ key: 'warn.low_ach', value: ach })
  if (ach > 25) warnings.push({ key: 'warn.high_ach', value: ach })
  return { supplyM3h, supplyLs: supplyM3h / 3.6, supplyKgS, airChangesPerHour: ach, outdoorM3h: oaM3h, outdoorFraction, states, tSupply, wSupply, adp, bypassFactor, coilSHR, coilKW, warnings }
}
