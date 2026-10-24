// Modelos prontos: ambientes, cidades (condições de projeto), paredes, vidros, atividades. Todos editáveis.
import type { ActivityId, EnvironmentId, HvacSystem, Orientation, Scenario, Wall } from './types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export interface CityPreset {
  id: string
  name: string
  tExt: number
  twb: number
  altitude: number
  dailyRange: number
}

// Condições de verão de projeto (≈ 1 % anual; NBR 16401-1 Anexo A / ASHRAE), arredondadas.
export const CITIES: CityPreset[] = [
  { id: 'sao_paulo', name: 'São Paulo (SP)', tExt: 32, twb: 21.5, altitude: 800, dailyRange: 10 },
  { id: 'rio', name: 'Rio de Janeiro (RJ)', tExt: 35, twb: 26, altitude: 10, dailyRange: 8 },
  { id: 'bh', name: 'Belo Horizonte (MG)', tExt: 32, twb: 21, altitude: 850, dailyRange: 11 },
  { id: 'brasilia', name: 'Brasília (DF)', tExt: 31.5, twb: 19.5, altitude: 1160, dailyRange: 13 },
  { id: 'curitiba', name: 'Curitiba (PR)', tExt: 30, twb: 21, altitude: 920, dailyRange: 10 },
  { id: 'poa', name: 'Porto Alegre (RS)', tExt: 34, twb: 24, altitude: 10, dailyRange: 10 },
  { id: 'floripa', name: 'Florianópolis (SC)', tExt: 32, twb: 24.5, altitude: 5, dailyRange: 8 },
  { id: 'campinas', name: 'Campinas (SP)', tExt: 33, twb: 22, altitude: 690, dailyRange: 12 },
  { id: 'salvador', name: 'Salvador (BA)', tExt: 32, twb: 26, altitude: 50, dailyRange: 6 },
  { id: 'recife', name: 'Recife (PE)', tExt: 32, twb: 26, altitude: 10, dailyRange: 6 },
  { id: 'fortaleza', name: 'Fortaleza (CE)', tExt: 33, twb: 26, altitude: 20, dailyRange: 6 },
  { id: 'manaus', name: 'Manaus (AM)', tExt: 35, twb: 27, altitude: 90, dailyRange: 9 },
  { id: 'belem', name: 'Belém (PA)', tExt: 34, twb: 27, altitude: 10, dailyRange: 8 },
  { id: 'goiania', name: 'Goiânia (GO)', tExt: 34.5, twb: 22.5, altitude: 750, dailyRange: 13 },
  { id: 'cuiaba', name: 'Cuiabá (MT)', tExt: 38, twb: 25, altitude: 170, dailyRange: 12 },
  { id: 'custom', name: '—', tExt: 33, twb: 24, altitude: 0, dailyRange: 10 },
]

export interface WallPreset {
  id: string
  nameKey: string
  u: number
  mass: 'light' | 'medium' | 'heavy'
}
export const WALL_PRESETS: WallPreset[] = [
  { id: 'masonry', nameKey: 'wall.masonry', u: 2.5, mass: 'medium' },
  { id: 'masonry_ins', nameKey: 'wall.masonry_ins', u: 0.9, mass: 'medium' },
  { id: 'concrete', nameKey: 'wall.concrete', u: 3.2, mass: 'heavy' },
  { id: 'drywall_ins', nameKey: 'wall.drywall_ins', u: 0.6, mass: 'light' },
  { id: 'metal', nameKey: 'wall.metal', u: 3.5, mass: 'light' },
  { id: 'sandwich', nameKey: 'wall.sandwich', u: 0.5, mass: 'light' },
]

export interface RoofPreset {
  id: string
  nameKey: string
  u: number
  mass: 'light' | 'medium' | 'heavy'
}
export const ROOF_PRESETS: RoofPreset[] = [
  { id: 'slab', nameKey: 'roof.slab', u: 3.0, mass: 'heavy' },
  { id: 'slab_ins', nameKey: 'roof.slab_ins', u: 0.8, mass: 'heavy' },
  { id: 'metal', nameKey: 'roof.metal', u: 4.5, mass: 'light' },
  { id: 'metal_ins', nameKey: 'roof.metal_ins', u: 0.7, mass: 'light' },
  { id: 'ceiling_attic', nameKey: 'roof.ceiling_attic', u: 1.6, mass: 'medium' },
]

export interface GlassPreset {
  id: string
  nameKey: string
  u: number
  shgc: number
}
export const GLASS_PRESETS: GlassPreset[] = [
  { id: 'single_clear', nameKey: 'glass.single_clear', u: 5.8, shgc: 0.82 },
  { id: 'single_tinted', nameKey: 'glass.single_tinted', u: 5.8, shgc: 0.6 },
  { id: 'double_clear', nameKey: 'glass.double_clear', u: 2.8, shgc: 0.7 },
  { id: 'double_lowe', nameKey: 'glass.double_lowe', u: 1.8, shgc: 0.4 },
  { id: 'reflective', nameKey: 'glass.reflective', u: 5.0, shgc: 0.3 },
]

export const SHADING_PRESETS: { id: string; nameKey: string; factor: number }[] = [
  { id: 'none', nameKey: 'shade.none', factor: 1.0 },
  { id: 'curtain', nameKey: 'shade.curtain', factor: 0.7 },
  { id: 'blinds', nameKey: 'shade.blinds', factor: 0.55 },
  { id: 'external', nameKey: 'shade.external', factor: 0.35 },
]

/** Calor por pessoa (W sensível / latente) a ~24 °C, ASHRAE Fundamentals cap. 18 (valores ajustados). */
export const ACTIVITIES: Record<ActivityId, { sensible: number; latent: number }> = {
  seated_quiet: { sensible: 65, latent: 30 },
  sleeping: { sensible: 60, latent: 30 },
  office: { sensible: 75, latent: 55 },
  classroom: { sensible: 70, latent: 45 },
  standing_retail: { sensible: 75, latent: 60 },
  restaurant: { sensible: 80, latent: 80 },
  light_work: { sensible: 80, latent: 140 },
  dancing: { sensible: 90, latent: 160 },
  gym: { sensible: 210, latent: 315 },
}

export const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** CLTD de pico para paredes de massa média (K), hemisfério sul (fachada norte ensolarada). ASHRAE simplificado. */
export const WALL_CLTD: Record<Orientation, number> = { N: 14, NE: 16, E: 18, SE: 12, S: 8, SW: 12, W: 20, NW: 18 }
export const ROOF_CLTD = 24
/** Fator máximo de ganho solar por vidro (W/m²) ≈ latitude 20–25 °S, verão. */
export const SHGF: Record<Orientation, number> = { N: 250, NE: 420, E: 530, SE: 400, S: 110, SW: 400, W: 530, NW: 420 }

export const ENVIRONMENTS: EnvironmentId[] = ['office', 'meeting_room', 'classroom', 'gym', 'residence', 'retail', 'restaurant', 'hotel_room', 'hospital_room', 'auditorium', 'server_room', 'custom']

export const SYSTEMS: HvacSystem[] = ['split', 'vrf', 'rooftop', 'chiller_air', 'chiller_water']

export function makeWall(orientation: Orientation, glassArea: number, preset = WALL_PRESETS[0], glass = GLASS_PRESETS[0], shading = 0.7): Wall {
  return { orientation, exposed: true, areaOverride: null, uValue: preset.u, mass: preset.mass, color: 'medium', glassArea, glassU: glass.u, glassShgc: glass.shgc, shading }
}

function base(environment: EnvironmentId, name: string): Scenario {
  const now = new Date().toISOString()
  const sp = CITIES[0]
  return {
    id: uid(),
    name,
    environment,
    createdAt: now,
    updatedAt: now,
    notes: '',
    site: { city: sp.id, tExt: sp.tExt, twbExt: sp.twb, dailyRange: sp.dailyRange, altitude: sp.altitude, tInt: 24, rhInt: 50 },
    room: { length: 20, width: 10, height: 2.7 },
    walls: [makeWall('N', 12), makeWall('E', 0), makeWall('S', 12), makeWall('W', 0)],
    roof: { exposed: true, uValue: ROOF_PRESETS[1].u, color: 'medium', mass: 'heavy' },
    floor: { kind: 'conditioned', uValue: 2.0 },
    internal: { people: null, areaPerPerson: 10, activity: 'office', lightingWPerM2: 9, lightingFactor: 1.0, equipmentWPerM2: 12, equipmentKW: 0, diversityPeople: 0.9, diversityLights: 0.9, diversityEquipment: 0.8 },
    ventilation: { method: 'per_person_area', perPersonLs: 2.5, perAreaLsM2: 0.3, achOutdoor: 1, manualM3h: 0, heatRecovery: 0, infiltrationACH: 0.3 },
    operation: { hoursPerDay: 10, safetyFactor: 10, fanHeatPct: 4, supplyDeltaT: 10 },
    equipment: { system: 'vrf', refrigerant: 'R32', copOverride: null, nUnits: null, standby: false, chwSupply: 7, chwDeltaT: 5.6, condApproach: 12, compressorType: 'scroll', superheat: 5, subcooling: 3, powerFactor: 0.92, voltage: 380, chargeKgPerKW: null },
  }
}

const setSystem = (s: Scenario, sys: HvacSystem, refrigerant: string, comp: 'scroll' | 'screw' = 'scroll') => {
  s.equipment = { ...s.equipment, system: sys, refrigerant, compressorType: comp }
}

export function createScenario(environment: EnvironmentId, name: string): Scenario {
  const s = base(environment, name)
  switch (environment) {
    case 'office':
      break
    case 'meeting_room':
      s.room = { length: 8, width: 5, height: 2.7 }
      s.walls = [makeWall('N', 6), makeWall('E', 0), makeWall('S', 0), makeWall('W', 0)]
      s.walls[1].exposed = s.walls[2].exposed = s.walls[3].exposed = false
      s.roof.exposed = false
      s.internal = { ...s.internal, areaPerPerson: 2, lightingWPerM2: 10, equipmentWPerM2: 5 }
      s.operation.hoursPerDay = 8
      setSystem(s, 'split', 'R32')
      break
    case 'classroom':
      s.room = { length: 8, width: 6.5, height: 3 }
      s.walls = [makeWall('N', 8), makeWall('E', 0), makeWall('S', 4), makeWall('W', 0)]
      s.walls[1].exposed = s.walls[3].exposed = false
      s.internal = { ...s.internal, areaPerPerson: 1.8, activity: 'classroom', lightingWPerM2: 10, equipmentWPerM2: 3 }
      s.ventilation = { ...s.ventilation, perPersonLs: 5, perAreaLsM2: 0.6 }
      s.operation.hoursPerDay = 8
      setSystem(s, 'split', 'R32')
      break
    case 'gym':
      s.room = { length: 25, width: 16, height: 4 }
      s.walls = [makeWall('N', 20, WALL_PRESETS[0], GLASS_PRESETS[1], 0.7), makeWall('E', 10, WALL_PRESETS[0], GLASS_PRESETS[1], 0.7), makeWall('S', 0), makeWall('W', 0)]
      s.roof = { exposed: true, uValue: ROOF_PRESETS[3].u, color: 'light', mass: 'light' }
      s.internal = { ...s.internal, areaPerPerson: 5, activity: 'gym', lightingWPerM2: 10, equipmentWPerM2: 8, diversityPeople: 0.8 }
      s.ventilation = { ...s.ventilation, perPersonLs: 10, perAreaLsM2: 0.3, infiltrationACH: 0.5 }
      s.operation = { ...s.operation, hoursPerDay: 16, supplyDeltaT: 10 }
      setSystem(s, 'rooftop', 'R454B')
      break
    case 'residence':
      s.room = { length: 6, width: 4.5, height: 2.7 }
      s.walls = [makeWall('N', 3, WALL_PRESETS[0], GLASS_PRESETS[0], 0.7), makeWall('E', 0), makeWall('S', 0), makeWall('W', 2)]
      s.walls[1].exposed = s.walls[2].exposed = false
      s.roof = { exposed: true, uValue: ROOF_PRESETS[4].u, color: 'medium', mass: 'medium' }
      s.internal = { ...s.internal, people: 3, activity: 'seated_quiet', lightingWPerM2: 5, equipmentWPerM2: 5, diversityPeople: 1, diversityLights: 1, diversityEquipment: 1 }
      s.ventilation = { ...s.ventilation, perPersonLs: 2.5, perAreaLsM2: 0.3, infiltrationACH: 0.5 }
      s.operation = { ...s.operation, hoursPerDay: 8 }
      setSystem(s, 'split', 'R32')
      break
    case 'retail':
      s.room = { length: 25, width: 12, height: 4 }
      s.walls = [makeWall('N', 30, WALL_PRESETS[0], GLASS_PRESETS[1], 0.8), makeWall('E', 0), makeWall('S', 0), makeWall('W', 0)]
      s.walls[1].exposed = s.walls[3].exposed = false
      s.roof = { exposed: true, uValue: ROOF_PRESETS[0].u, color: 'medium', mass: 'heavy' }
      s.internal = { ...s.internal, areaPerPerson: 5, activity: 'standing_retail', lightingWPerM2: 20, equipmentWPerM2: 5 }
      s.ventilation = { ...s.ventilation, perPersonLs: 3.8, perAreaLsM2: 0.6, infiltrationACH: 1.0 }
      s.operation = { ...s.operation, hoursPerDay: 12 }
      setSystem(s, 'vrf', 'R410A')
      break
    case 'restaurant':
      s.room = { length: 15, width: 10, height: 3.2 }
      s.walls = [makeWall('N', 12), makeWall('E', 8), makeWall('S', 0), makeWall('W', 0)]
      s.walls[2].exposed = s.walls[3].exposed = false
      s.internal = { ...s.internal, areaPerPerson: 1.5, activity: 'restaurant', lightingWPerM2: 12, equipmentWPerM2: 15, diversityPeople: 0.85 }
      s.ventilation = { ...s.ventilation, perPersonLs: 3.8, perAreaLsM2: 0.9, infiltrationACH: 0.8 }
      s.operation = { ...s.operation, hoursPerDay: 12 }
      setSystem(s, 'vrf', 'R32')
      break
    case 'hotel_room':
      s.room = { length: 7, width: 4, height: 2.6 }
      s.walls = [makeWall('N', 4, WALL_PRESETS[0], GLASS_PRESETS[2], 0.6), makeWall('E', 0), makeWall('S', 0), makeWall('W', 0)]
      s.walls[1].exposed = s.walls[2].exposed = s.walls[3].exposed = false
      s.roof.exposed = false
      s.internal = { ...s.internal, people: 2, activity: 'sleeping', lightingWPerM2: 8, equipmentWPerM2: 8, diversityPeople: 1, diversityLights: 1, diversityEquipment: 1 }
      s.operation = { ...s.operation, hoursPerDay: 24 }
      setSystem(s, 'vrf', 'R32')
      break
    case 'hospital_room':
      s.room = { length: 6, width: 3.5, height: 2.8 }
      s.walls = [makeWall('N', 3, WALL_PRESETS[0], GLASS_PRESETS[2], 0.6), makeWall('E', 0), makeWall('S', 0), makeWall('W', 0)]
      s.walls[1].exposed = s.walls[2].exposed = s.walls[3].exposed = false
      s.roof.exposed = false
      s.internal = { ...s.internal, people: 3, activity: 'seated_quiet', lightingWPerM2: 10, equipmentWPerM2: 10, diversityPeople: 1, diversityLights: 1, diversityEquipment: 1 }
      s.ventilation = { ...s.ventilation, method: 'ach', achOutdoor: 2, infiltrationACH: 0.2 }
      s.operation = { ...s.operation, hoursPerDay: 24, supplyDeltaT: 9 }
      setSystem(s, 'chiller_water', 'R134a', 'screw')
      s.equipment.standby = true
      break
    case 'auditorium':
      s.room = { length: 30, width: 18, height: 7 }
      s.walls = [makeWall('N', 0), makeWall('E', 0), makeWall('S', 0), makeWall('W', 0)]
      s.roof = { exposed: true, uValue: ROOF_PRESETS[1].u, color: 'light', mass: 'heavy' }
      s.internal = { ...s.internal, areaPerPerson: 0.75, activity: 'seated_quiet', lightingWPerM2: 15, equipmentWPerM2: 5, diversityPeople: 1 }
      s.ventilation = { ...s.ventilation, perPersonLs: 2.5, perAreaLsM2: 0.3, infiltrationACH: 0.2 }
      s.operation = { ...s.operation, hoursPerDay: 6, supplyDeltaT: 11 }
      setSystem(s, 'chiller_air', 'R513A', 'screw')
      break
    case 'server_room':
      s.room = { length: 6, width: 5, height: 3 }
      s.walls = [makeWall('N', 0), makeWall('E', 0), makeWall('S', 0), makeWall('W', 0)]
      s.walls.forEach((w) => (w.exposed = false))
      s.roof.exposed = false
      s.site = { ...s.site, tInt: 22, rhInt: 50 }
      s.internal = { ...s.internal, people: 0, lightingWPerM2: 8, equipmentWPerM2: 0, equipmentKW: 15, diversityEquipment: 1 }
      s.ventilation = { ...s.ventilation, method: 'manual', manualM3h: 50, infiltrationACH: 0.2 }
      s.operation = { ...s.operation, hoursPerDay: 24, supplyDeltaT: 12, safetyFactor: 15 }
      setSystem(s, 'split', 'R410A')
      s.equipment.standby = true
      break
    default:
      break
  }
  return s
}
