import { describe, expect, it } from 'vitest'
import { computeLoad, pressureAtAltitude } from '../hvac'
import { createScenario } from '../presets'
import { computeEquipment, cycleInputFor, SYSTEM_PRESETS } from '../equipment'
import { loadFluid } from '../props'

describe('carga térmica de climatização', () => {
  it('pressão pela altitude', () => {
    expect(pressureAtAltitude(0)).toBeCloseTo(101.325, 3)
    expect(pressureAtAltitude(800)).toBeCloseTo(92.08, 0)
  })

  it('escritório 200 m² em São Paulo: 80–180 W/m², SHR plausível', () => {
    const sc = createScenario('office', 't')
    const r = computeLoad(sc)
    expect(r.geometry.floorArea).toBe(200)
    expect(r.people).toBe(20)
    expect(r.wPerM2).toBeGreaterThan(80)
    expect(r.wPerM2).toBeLessThan(180)
    expect(r.shrRoom).toBeGreaterThan(0.7)
    expect(r.shrRoom).toBeLessThan(0.98)
    expect(r.capacityW).toBeCloseTo(r.coilTotal * 1.1, 3)
    const sumS = r.items.reduce((a, i) => a + i.sensible, 0)
    const sumL = r.items.reduce((a, i) => a + i.latent, 0)
    expect(sumS + sumL).toBeCloseTo(r.coilTotal, 3)
  })

  it('academia tem carga latente alta e SHR menor que escritório', () => {
    const gym = computeLoad(createScenario('gym', 'g'))
    const office = computeLoad(createScenario('office', 'o'))
    expect(gym.shrRoom).toBeLessThan(office.shrRoom)
    expect(gym.roomLatent / gym.roomTotal).toBeGreaterThan(0.2)
  })

  it('psicrometria do insuflamento: vazão, mistura e ADP consistentes', () => {
    const r = computeLoad(createScenario('office', 't'))
    const a = r.air
    expect(a.supplyM3h).toBeGreaterThan(0)
    expect(a.outdoorFraction).toBeGreaterThan(0)
    expect(a.outdoorFraction).toBeLessThan(1)
    const ma = a.states.find((s) => s.id === 'MA')!
    const ra = a.states.find((s) => s.id === 'RA')!
    const oa = a.states.find((s) => s.id === 'OA')!
    expect(ma.T).toBeGreaterThan(ra.T)
    expect(ma.T).toBeLessThan(oa.T)
    expect(a.adp).not.toBeNull()
    expect(a.adp!).toBeLessThan(a.tSupply)
    expect(a.bypassFactor!).toBeGreaterThanOrEqual(0)
    expect(a.bypassFactor!).toBeLessThan(0.5)
    // carga na serpentina ≈ ambiente + ar externo (sem fator de segurança), tolerância 8 %
    expect(Math.abs(a.coilKW * 1000 / r.coilTotal - 1)).toBeLessThan(0.08)
  })

  it('sala de servidores: só equipamento, SHR ≈ 1', () => {
    const r = computeLoad(createScenario('server_room', 's'))
    expect(r.people).toBe(0)
    expect(r.shrRoom).toBeGreaterThan(0.97)
    expect(r.byGroup.equipment.sensible).toBeCloseTo(15000, 0)
  })

  it('seleção de equipamento: VRF e chiller', async () => {
    const sc = createScenario('office', 't')
    const load = computeLoad(sc)
    const f = await loadFluid('R32')
    const { result, cycle } = computeEquipment(sc, load, f)
    expect(result.units.operating).toBeGreaterThanOrEqual(1)
    expect(result.units.unitKW * result.units.operating).toBeGreaterThanOrEqual(load.capacityKW)
    expect(result.electrical.totalKW).toBeGreaterThan(load.capacityKW / 5)
    expect(result.electrical.totalKW).toBeLessThan(load.capacityKW / 2)
    expect(cycle).not.toBeNull()
    expect(result.cop.cycle!).toBeGreaterThan(2)
    expect(result.refrigerant.roomChargeLimitKg).not.toBeNull()

    const h = createScenario('hospital_room', 'h')
    const hl = computeLoad(h)
    const f134 = await loadFluid('R134a')
    const eq = computeEquipment(h, hl, f134)
    expect(eq.result.water.chwFlowM3h).toBeGreaterThan(0)
    expect(eq.result.water.cwFlowM3h).toBeGreaterThan(0)
    expect(eq.result.units.installed).toBe(eq.result.units.operating + 1)
    const ci = cycleInputFor(h, SYSTEM_PRESETS.chiller_water)
    expect(ci.tEvap).toBe(4)
    expect(ci.tCond).toBeCloseTo(h.site.twbExt + h.equipment.condApproach, 6)
  })
})
