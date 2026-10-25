// Core ClimaCalc types. Internal units are SI: W/kW, °C for input, K in the thermodynamic code, kPa, kJ/kg, m, m², m³, m³/h.

export type EnvironmentId = 'office' | 'meeting_room' | 'classroom' | 'gym' | 'residence' | 'retail' | 'restaurant' | 'hotel_room' | 'hospital_room' | 'auditorium' | 'server_room' | 'custom'

export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
export type MassClass = 'light' | 'medium' | 'heavy'
export type SurfaceColor = 'light' | 'medium' | 'dark'
export type ActivityId = 'seated_quiet' | 'office' | 'classroom' | 'standing_retail' | 'restaurant' | 'light_work' | 'dancing' | 'gym' | 'sleeping'
export type VentilationMethod = 'per_person_area' | 'ach' | 'manual'
export type HvacSystem = 'split' | 'vrf' | 'rooftop' | 'chiller_air' | 'chiller_water'
export type CompressorType = 'reciprocating' | 'screw' | 'scroll'
export type SystemType = 'single' | 'two_stage' | 'cascade' | 'transcritical'

export interface Site {
  city: string
  tExt: number // °C, design dry bulb
  twbExt: number // °C, coincident wet bulb
  dailyRange: number // K, mean daily range
  altitude: number // m
  tInt: number // °C
  rhInt: number // %
}

export interface RoomGeom {
  length: number // m, along the N and S facades
  width: number // m, along the E and W facades
  height: number // m
}

export interface Wall {
  orientation: Orientation
  exposed: boolean // false = interior partition next to an unconditioned space
  areaOverride: number | null // m²; null = from the room dimensions
  uValue: number // W/m²K
  mass: MassClass
  color: SurfaceColor
  glassArea: number // m²
  glassU: number // W/m²K
  glassShgc: number // 0–1
  shading: number // 0–1 shading factor (1 = unshaded)
}

export interface Roof {
  exposed: boolean
  uValue: number
  color: SurfaceColor
  mass: MassClass
}

export interface Floor {
  kind: 'ground' | 'unconditioned' | 'conditioned'
  uValue: number
}

export interface InternalGains {
  people: number | null // null = floor area / areaPerPerson
  areaPerPerson: number // m²/person
  activity: ActivityId
  lightingWPerM2: number
  lightingFactor: number // ballast / driver losses (1.0 LED, 1.2 fluorescent)
  equipmentWPerM2: number
  equipmentKW: number // extra fixed load (servers, kitchen, etc.)
  diversityPeople: number // 0–1
  diversityLights: number
  diversityEquipment: number
}

export interface VentilationInput {
  method: VentilationMethod
  perPersonLs: number // L/s per person (NBR 16401-3)
  perAreaLsM2: number // L/s per m²
  achOutdoor: number // outdoor air changes per hour ('ach' method)
  manualM3h: number
  heatRecovery: number // 0–0.8 heat recovery effectiveness (0 = none)
  infiltrationACH: number
}

export interface Operation {
  hoursPerDay: number
  safetyFactor: number // %
  fanHeatPct: number // % of room sensible load
  supplyDeltaT: number // K, room minus supply air temperature
}

export interface EquipmentInput {
  system: HvacSystem
  refrigerant: string
  copOverride: number | null // kW cooling / kW_el, system nominal
  nUnits: number | null // null = suggested
  standby: boolean
  chwSupply: number // °C, chilled water supply (chillers)
  chwDeltaT: number // K
  condApproach: number // K, condensing temperature above outdoor dry bulb (air-cooled) or wet bulb (water-cooled)
  compressorType: CompressorType
  superheat: number
  subcooling: number
  powerFactor: number
  voltage: number
  chargeKgPerKW: number | null
}

export interface Scenario {
  id: string
  name: string
  environment: EnvironmentId
  createdAt: string
  updatedAt: string
  notes: string
  site: Site
  room: RoomGeom
  walls: Wall[]
  roof: Roof
  floor: Floor
  internal: InternalGains
  ventilation: VentilationInput
  operation: Operation
  equipment: EquipmentInput
}

// results

export interface Warning {
  key: string
  value?: number
}

export type LoadGroup = 'envelope' | 'solar' | 'people' | 'lights' | 'equipment' | 'infiltration' | 'outdoor_air' | 'fan'

export interface LoadItem {
  key: string
  labelKey: string
  label?: string
  group: LoadGroup
  sensible: number // W
  latent: number // W
  detail?: string
}

export interface AirState {
  id: string // OA, RA, MA, SA, ADP
  T: number
  W: number
  RH: number
  h: number
  Twb: number
  Tdp: number
}

export interface AirResult {
  supplyM3h: number
  supplyLs: number
  supplyKgS: number
  airChangesPerHour: number
  outdoorM3h: number
  outdoorFraction: number
  states: AirState[]
  tSupply: number
  wSupply: number
  adp: number | null
  bypassFactor: number | null
  coilSHR: number
  coilKW: number
  warnings: Warning[]
}

export interface LoadResult {
  items: LoadItem[]
  byGroup: Record<LoadGroup, { sensible: number; latent: number }>
  roomSensible: number // W
  roomLatent: number
  roomTotal: number
  outdoorSensible: number
  outdoorLatent: number
  coilTotal: number
  safetyW: number
  capacityW: number
  capacityKW: number
  shrRoom: number
  wPerM2: number
  m2PerTR: number
  people: number
  outdoorM3h: number
  geometry: { floorArea: number; volume: number; wallAreas: Record<Orientation, number> }
  air: AirResult
  outdoor: { T: number; W: number; h: number; P: number }
  indoor: { T: number; W: number; h: number }
  energyKWhDay: number
  warnings: Warning[]
}

export interface CycleInput {
  refrigerant: string
  system: SystemType
  tEvap: number
  tCond: number
  superheat: number
  subcooling: number
  compressorType: CompressorType
  etaIsOverride: number | null
  etaVolOverride: number | null
  motorEff: number
  tInter: number | null
  cascade: { refrigerantHT: string; tCascade: number; dtCascade: number }
  transcritical: { tGasCoolerOut: number; pGasCooler: number | null }
}

export type Region = 'sh' | 'sat_v' | 'sat_l' | 'two_phase' | 'liq' | 'sc'

export interface StatePoint {
  id: string
  P: number
  T: number
  h: number
  s: number
  rho: number
  x?: number
  region: Region
}

export interface StageResult {
  name: string
  pressureRatio: number
  etaIs: number
  etaVol: number
  mdot: number
  Wshaft: number
  Vsuction: number
  Vdisplacement: number
  Tdischarge: number
  Psuction: number
  Pdischarge: number
}

export interface CycleResult {
  system: SystemType
  fluid: string
  points: StatePoint[]
  path: StatePoint[]
  stages: StageResult[]
  Qevap: number
  Wtotal: number
  Qcond: number
  COP: number
  COPCarnot: number
  secondLawEff: number
  glideEvap: number
  glideCond: number
  Pevap: number
  Pcond: number
  Tevap: number
  Tcond: number
  warnings: Warning[]
  ht?: CycleResult
}

export interface EquipmentResult {
  system: HvacSystem
  capacityKW: number
  units: { operating: number; installed: number; unitKW: number; unitLabel: string; indoorUnits: number; indoorUnitKW: number }
  cop: { nominal: number; cycle: number | null; usedForPower: number; tEvap: number; tCond: number }
  electrical: { compressorsKW: number; fansKW: number; pumpsKW: number; towerKW: number; totalKW: number; kVA: number; amps: number; transformerKVA: number; kWPerTR: number; kWhDay: number }
  water: { chwFlowM3h?: number; cwFlowM3h?: number; makeupM3h?: number; heatRejectionKW: number }
  refrigerant: { chargeKg: number; chargeKgPerKW: number; co2eTon: number; roomChargeLimitKg: number | null; chargePerCircuitKg: number; ventilationEmergencyM3h: number | null }
  space: { indoorAreaM2: number | null; outdoorAreaM2: number }
  warnings: Warning[]
}
