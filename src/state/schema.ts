// Strict scenario validation for imported files, share links and localStorage.
import { z } from 'zod'
import type { Scenario } from '../engine/types'

const num = (min: number, max: number) => z.number().finite().min(min).max(max)
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/)
const shortText = z.string().max(120)
const orientation = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])
const mass = z.enum(['light', 'medium', 'heavy'])
const color = z.enum(['light', 'medium', 'dark'])

export const scenarioSchema = z.object({
  id,
  name: shortText.min(1),
  environment: z.enum(['office', 'meeting_room', 'classroom', 'gym', 'residence', 'retail', 'restaurant', 'hotel_room', 'hospital_room', 'auditorium', 'server_room', 'custom']),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  notes: z.string().max(4000),
  site: z.object({ city: z.string().max(40), tExt: num(-20, 55), twbExt: num(-25, 40), dailyRange: num(0, 30), altitude: num(-500, 6000), tInt: num(10, 35), rhInt: num(10, 90) }),
  room: z.object({ length: num(0.5, 500), width: num(0.5, 500), height: num(1.5, 40) }),
  walls: z
    .array(
      z.object({
        orientation,
        exposed: z.boolean(),
        areaOverride: num(0, 50000).nullable(),
        uValue: num(0.05, 10),
        mass,
        color,
        glassArea: num(0, 50000),
        glassU: num(0.3, 8),
        glassShgc: num(0, 1),
        shading: num(0, 1),
      }),
    )
    .max(12),
  roof: z.object({ exposed: z.boolean(), uValue: num(0.05, 10), color, mass }),
  floor: z.object({ kind: z.enum(['ground', 'unconditioned', 'conditioned']), uValue: num(0.05, 10) }),
  internal: z.object({
    people: num(0, 100000).nullable(),
    areaPerPerson: num(0.3, 500),
    activity: z.enum(['seated_quiet', 'office', 'classroom', 'standing_retail', 'restaurant', 'light_work', 'dancing', 'gym', 'sleeping']),
    lightingWPerM2: num(0, 200),
    lightingFactor: num(0.5, 2),
    equipmentWPerM2: num(0, 2000),
    equipmentKW: num(0, 50000),
    diversityPeople: num(0, 1),
    diversityLights: num(0, 1),
    diversityEquipment: num(0, 1),
  }),
  ventilation: z.object({
    method: z.enum(['per_person_area', 'ach', 'manual']),
    perPersonLs: num(0, 100),
    perAreaLsM2: num(0, 20),
    achOutdoor: num(0, 60),
    manualM3h: num(0, 1e7),
    heatRecovery: num(0, 0.85),
    infiltrationACH: num(0, 20),
  }),
  operation: z.object({ hoursPerDay: num(0, 24), safetyFactor: num(0, 100), fanHeatPct: num(0, 30), supplyDeltaT: num(4, 20) }),
  equipment: z.object({
    system: z.enum(['split', 'vrf', 'rooftop', 'chiller_air', 'chiller_water']),
    refrigerant: z.string().regex(/^R[0-9A-Za-z()]{1,12}$/),
    copOverride: num(1, 12).nullable(),
    nUnits: num(1, 200).nullable(),
    standby: z.boolean(),
    chwSupply: num(2, 20),
    chwDeltaT: num(2, 12),
    condApproach: num(3, 30),
    compressorType: z.enum(['reciprocating', 'screw', 'scroll']),
    superheat: num(0, 30),
    subcooling: num(0, 30),
    powerFactor: num(0.6, 1),
    voltage: num(100, 15000),
    chargeKgPerKW: num(0, 10).nullable(),
  }),
})

export const envelopeSchema = z.object({ v: z.literal(1), s: scenarioSchema })

export function parseScenario(data: unknown): Scenario | null {
  const direct = scenarioSchema.safeParse(data)
  if (direct.success) return direct.data as Scenario
  const env = envelopeSchema.safeParse(data)
  if (env.success) return env.data.s as Scenario
  return null
}

export const MAX_IMPORT_BYTES = 256 * 1024
