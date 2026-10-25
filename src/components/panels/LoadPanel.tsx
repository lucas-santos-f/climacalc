import { X } from 'lucide-react'
import { Alerts, Card, CheckField, NumberField, SelectField, Stat } from '../ui/Field'
import { useStore } from '../../state/store'
import { useT, useUnits, type Computed } from '../../hooks'
import type { ActivityId, LoadResult, MassClass, Orientation, Scenario, SurfaceColor, VentilationMethod, Wall } from '../../engine/types'
import { ACTIVITIES, CITIES, GLASS_PRESETS, ORIENTATIONS, ROOF_PRESETS, SHADING_PRESETS, WALL_PRESETS, makeWall } from '../../engine/presets'
import { LoadBars, LoadDonut } from '../charts/LoadBreakdown'
import { itemLabel } from '../../labels'
import { powerAlternatives } from '../../units'

const MASSES: MassClass[] = ['light', 'medium', 'heavy']
const COLORS: SurfaceColor[] = ['light', 'medium', 'dark']
const ACTIVITY_IDS = Object.keys(ACTIVITIES) as ActivityId[]

function WallEditor({ w, idx, sc }: { w: Wall; idx: number; sc: Scenario }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const set = (patch: Partial<Wall>) => update((d) => Object.assign(d.walls[idx], patch))
  const wallPreset = WALL_PRESETS.find((p) => Math.abs(p.u - w.uValue) < 1e-6 && p.mass === w.mass)?.id ?? 'custom'
  const glassPreset = GLASS_PRESETS.find((p) => Math.abs(p.u - w.glassU) < 1e-6 && Math.abs(p.shgc - w.glassShgc) < 1e-6)?.id ?? 'custom'
  const shadePreset = SHADING_PRESETS.find((p) => Math.abs(p.factor - w.shading) < 1e-6)?.id ?? 'custom'
  const facadeLen = w.orientation === 'N' || w.orientation === 'S' ? sc.room.length : w.orientation === 'E' || w.orientation === 'W' ? sc.room.width : Math.hypot(sc.room.length, sc.room.width) / 2
  const autoArea = facadeLen * sc.room.height
  return (
    <div className="list-item">
      <header>
        <strong>
          {t('wall.orientation')} {w.orientation} <span className="muted">· {u.show('area', w.areaOverride ?? autoArea, 1)}</span>
        </strong>
        <button type="button" className="btn small icon ghost danger no-print" aria-label={t('common.remove')} title={t('common.remove')} onClick={() => update((d) => d.walls.splice(idx, 1))}>
          <X size={16} />
        </button>
      </header>
      <div className="fields">
        <SelectField label={t('wall.orientation')} value={w.orientation} onChange={(v) => set({ orientation: v as Orientation })} options={ORIENTATIONS.map((o) => ({ value: o, label: o }))} />
        <CheckField label={t('wall.exposed')} checked={w.exposed} onChange={(v) => set({ exposed: v })} />
        <NumberField label={t('wall.area')} value={w.areaOverride} onChange={(v) => set({ areaOverride: v })} quantity="area" nullable autoHint={u.val('area', autoArea, 1)} min={0} max={50000} />
        <SelectField
          label={t('wall.preset')}
          value={wallPreset}
          onChange={(id) => {
            const p = WALL_PRESETS.find((x) => x.id === id)
            if (p) set({ uValue: p.u, mass: p.mass })
          }}
          options={[...WALL_PRESETS.map((p) => ({ value: p.id, label: t(p.nameKey) })), { value: 'custom', label: '—' }]}
        />
        <NumberField label={t('wall.uValue')} value={w.uValue} onChange={(v) => set({ uValue: v ?? w.uValue })} quantity="uvalue" min={0.05} max={10} />
        <SelectField label={t('wall.mass')} value={w.mass} onChange={(v) => set({ mass: v as MassClass })} options={MASSES.map((m) => ({ value: m, label: t(`mass.${m}`) }))} />
        <SelectField label={t('wall.color')} value={w.color} onChange={(v) => set({ color: v as SurfaceColor })} options={COLORS.map((c) => ({ value: c, label: t(`color.${c}`) }))} />
        {w.exposed && (
          <>
            <NumberField label={t('wall.glassArea')} value={w.glassArea} onChange={(v) => set({ glassArea: v ?? 0 })} quantity="area" min={0} max={50000} />
            <SelectField
              label={t('wall.glassPreset')}
              value={glassPreset}
              onChange={(id) => {
                const p = GLASS_PRESETS.find((x) => x.id === id)
                if (p) set({ glassU: p.u, glassShgc: p.shgc })
              }}
              options={[...GLASS_PRESETS.map((p) => ({ value: p.id, label: t(p.nameKey) })), { value: 'custom', label: '—' }]}
            />
            <NumberField label={t('wall.glassU')} value={w.glassU} onChange={(v) => set({ glassU: v ?? w.glassU })} quantity="uvalue" min={0.3} max={8} />
            <NumberField label={t('wall.glassShgc')} value={w.glassShgc} onChange={(v) => set({ glassShgc: v ?? w.glassShgc })} unit="—" min={0} max={1} />
            <SelectField
              label={t('wall.shadePreset')}
              value={shadePreset}
              onChange={(id) => {
                const p = SHADING_PRESETS.find((x) => x.id === id)
                if (p) set({ shading: p.factor })
              }}
              options={[...SHADING_PRESETS.map((p) => ({ value: p.id, label: t(p.nameKey) })), { value: 'custom', label: '—' }]}
            />
            <NumberField label={t('wall.shading')} value={w.shading} onChange={(v) => set({ shading: v ?? w.shading })} unit="—" min={0} max={1} />
          </>
        )}
      </div>
    </div>
  )
}

export function LoadPanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const L = computed.load
  const roofPreset = ROOF_PRESETS.find((p) => Math.abs(p.u - sc.roof.uValue) < 1e-6 && p.mass === sc.roof.mass)?.id ?? 'custom'

  return (
    <>
      <div className="workspace">
        <div className="stack">
          <Card title={t('site.title')} hint={t('site.hint')}>
            <div className="fields">
              <SelectField
                label={t('site.city')}
                value={sc.site.city}
                onChange={(id) => {
                  const c = CITIES.find((x) => x.id === id)
                  if (c) update((d) => (d.site = { ...d.site, city: c.id, tExt: c.tExt, twbExt: c.twb, altitude: c.altitude, dailyRange: c.dailyRange }))
                }}
                options={CITIES.map((c) => ({ value: c.id, label: c.name }))}
              />
              <NumberField label={t('site.tExt')} value={sc.site.tExt} onChange={(v) => update((d) => ((d.site.tExt = v ?? d.site.tExt), (d.site.city = 'custom')))} quantity="temp" min={-20} max={55} digits={1} />
              <NumberField label={t('site.twbExt')} value={sc.site.twbExt} onChange={(v) => update((d) => ((d.site.twbExt = Math.min(v ?? d.site.twbExt, d.site.tExt)), (d.site.city = 'custom')))} quantity="temp" min={-25} max={40} digits={1} />
              <NumberField label={t('site.dailyRange')} value={sc.site.dailyRange} onChange={(v) => update((d) => (d.site.dailyRange = v ?? d.site.dailyRange))} quantity="dtemp" min={0} max={30} digits={1} />
              <NumberField label={t('site.altitude')} value={sc.site.altitude} onChange={(v) => update((d) => (d.site.altitude = v ?? d.site.altitude))} quantity="length" min={-500} max={6000} digits={0} />
              <NumberField label={t('site.tInt')} value={sc.site.tInt} onChange={(v) => update((d) => (d.site.tInt = v ?? d.site.tInt))} quantity="temp" min={10} max={35} digits={1} />
              <NumberField label={t('site.rhInt')} value={sc.site.rhInt} onChange={(v) => update((d) => (d.site.rhInt = v ?? d.site.rhInt))} unit="%" min={10} max={90} digits={0} />
            </div>
          </Card>

          <Card title={t('room.title')}>
            <div className="fields">
              <NumberField label={t('room.length')} value={sc.room.length} onChange={(v) => update((d) => (d.room.length = v ?? d.room.length))} quantity="length" min={0.5} max={500} />
              <NumberField label={t('room.width')} value={sc.room.width} onChange={(v) => update((d) => (d.room.width = v ?? d.room.width))} quantity="length" min={0.5} max={500} />
              <NumberField label={t('room.height')} value={sc.room.height} onChange={(v) => update((d) => (d.room.height = v ?? d.room.height))} quantity="length" min={1.5} max={40} />
            </div>
            <div className="stats" style={{ marginTop: 16 }}>
              <Stat label={t('room.floorArea')} value={u.show('area', L.geometry.floorArea, 1)} />
              <Stat label={t('room.volume')} value={u.show('volume', L.geometry.volume, 0)} />
              <Stat label={t('load.people_count')} value={L.people} />
            </div>
            <h3>{t('roof.title')}</h3>
            <div className="fields">
              <CheckField label={t('roof.exposed')} checked={sc.roof.exposed} onChange={(v) => update((d) => (d.roof.exposed = v))} />
              <SelectField
                label={t('roof.preset')}
                value={roofPreset}
                onChange={(id) => {
                  const p = ROOF_PRESETS.find((x) => x.id === id)
                  if (p) update((d) => ((d.roof.uValue = p.u), (d.roof.mass = p.mass)))
                }}
                options={[...ROOF_PRESETS.map((p) => ({ value: p.id, label: t(p.nameKey) })), { value: 'custom', label: '—' }]}
              />
              <NumberField label={t('roof.uValue')} value={sc.roof.uValue} onChange={(v) => update((d) => (d.roof.uValue = v ?? d.roof.uValue))} quantity="uvalue" min={0.05} max={10} />
              <SelectField label={t('roof.color')} value={sc.roof.color} onChange={(v) => update((d) => (d.roof.color = v as SurfaceColor))} options={COLORS.map((c) => ({ value: c, label: t(`color.${c}`) }))} />
              <SelectField label={t('roof.mass')} value={sc.roof.mass} onChange={(v) => update((d) => (d.roof.mass = v as MassClass))} options={MASSES.map((m) => ({ value: m, label: t(`mass.${m}`) }))} />
              <SelectField
                label={t('floor.kind')}
                value={sc.floor.kind}
                onChange={(v) => update((d) => (d.floor.kind = v as Scenario['floor']['kind']))}
                options={(['conditioned', 'unconditioned', 'ground'] as const).map((k) => ({ value: k, label: t(`floor.${k}`) }))}
              />
              {sc.floor.kind === 'unconditioned' && <NumberField label={t('floor.uValue')} value={sc.floor.uValue} onChange={(v) => update((d) => (d.floor.uValue = v ?? d.floor.uValue))} quantity="uvalue" min={0.05} max={10} />}
            </div>
          </Card>

          <Card
            title={t('wall.title')}
            right={
              <button type="button" className="btn small primary no-print" disabled={sc.walls.length >= 12} onClick={() => update((d) => d.walls.push(makeWall('N', 0)))}>
                + {t('wall.add')}
              </button>
            }
          >
            {sc.walls.length === 0 && <div className="empty">{t('common.none')}</div>}
            {sc.walls.map((w, i) => (
              <WallEditor key={i} w={w} idx={i} sc={sc} />
            ))}
          </Card>

          <Card title={t('int.title')}>
            <div className="fields">
              <NumberField label={t('int.people')} value={sc.internal.people} onChange={(v) => update((d) => (d.internal.people = v))} unit="" nullable autoHint={String(L.people)} min={0} max={100000} digits={0} />
              <NumberField label={t('int.areaPerPerson')} value={sc.internal.areaPerPerson} onChange={(v) => update((d) => (d.internal.areaPerPerson = v ?? d.internal.areaPerPerson))} quantity="area" min={0.3} max={500} />
              <SelectField label={t('int.activity')} value={sc.internal.activity} onChange={(v) => update((d) => (d.internal.activity = v as ActivityId))} options={ACTIVITY_IDS.map((a) => ({ value: a, label: `${t(`act.${a}`)} (${ACTIVITIES[a].sensible}+${ACTIVITIES[a].latent} W)` }))} />
              <NumberField label={t('int.lightingWPerM2')} value={sc.internal.lightingWPerM2} onChange={(v) => update((d) => (d.internal.lightingWPerM2 = v ?? 0))} quantity="wpm2" min={0} max={200} />
              <NumberField label={t('int.lightingFactor')} value={sc.internal.lightingFactor} onChange={(v) => update((d) => (d.internal.lightingFactor = v ?? 1))} unit="—" min={0.5} max={2} />
              <NumberField label={t('int.equipmentWPerM2')} value={sc.internal.equipmentWPerM2} onChange={(v) => update((d) => (d.internal.equipmentWPerM2 = v ?? 0))} quantity="wpm2" min={0} max={2000} />
              <NumberField label={t('int.equipmentKW')} value={sc.internal.equipmentKW} onChange={(v) => update((d) => (d.internal.equipmentKW = v ?? 0))} quantity="power" min={0} max={50000} />
              <NumberField label={t('int.diversityPeople')} value={sc.internal.diversityPeople} onChange={(v) => update((d) => (d.internal.diversityPeople = v ?? 1))} unit="—" min={0} max={1} />
              <NumberField label={t('int.diversityLights')} value={sc.internal.diversityLights} onChange={(v) => update((d) => (d.internal.diversityLights = v ?? 1))} unit="—" min={0} max={1} />
              <NumberField label={t('int.diversityEquipment')} value={sc.internal.diversityEquipment} onChange={(v) => update((d) => (d.internal.diversityEquipment = v ?? 1))} unit="—" min={0} max={1} />
            </div>
          </Card>

          <Card title={t('vent.title')} hint={t('vent.hint')}>
            <div className="fields">
              <SelectField label={t('vent.method')} value={sc.ventilation.method} onChange={(v) => update((d) => (d.ventilation.method = v as VentilationMethod))} options={(['per_person_area', 'ach', 'manual'] as const).map((m) => ({ value: m, label: t(`vent.${m}`) }))} />
              {sc.ventilation.method === 'per_person_area' && (
                <>
                  <NumberField label={t('vent.perPersonLs')} value={sc.ventilation.perPersonLs} onChange={(v) => update((d) => (d.ventilation.perPersonLs = v ?? 0))} unit="L/s" min={0} max={100} />
                  <NumberField label={t('vent.perAreaLsM2')} value={sc.ventilation.perAreaLsM2} onChange={(v) => update((d) => (d.ventilation.perAreaLsM2 = v ?? 0))} unit="L/s·m²" min={0} max={20} />
                </>
              )}
              {sc.ventilation.method === 'ach' && <NumberField label={t('vent.achOutdoor')} value={sc.ventilation.achOutdoor} onChange={(v) => update((d) => (d.ventilation.achOutdoor = v ?? 0))} unit="1/h" min={0} max={60} />}
              {sc.ventilation.method === 'manual' && <NumberField label={t('vent.manualM3h')} value={sc.ventilation.manualM3h} onChange={(v) => update((d) => (d.ventilation.manualM3h = v ?? 0))} quantity="airflow" min={0} max={1e7} digits={0} />}
              <NumberField label={t('vent.heatRecovery')} value={sc.ventilation.heatRecovery} onChange={(v) => update((d) => (d.ventilation.heatRecovery = v ?? 0))} unit="—" min={0} max={0.85} />
              <NumberField label={t('vent.infiltrationACH')} value={sc.ventilation.infiltrationACH} onChange={(v) => update((d) => (d.ventilation.infiltrationACH = v ?? 0))} unit="1/h" min={0} max={20} />
            </div>
            <h3>{t('op.title')}</h3>
            <div className="fields">
              <NumberField label={t('op.hoursPerDay')} value={sc.operation.hoursPerDay} onChange={(v) => update((d) => (d.operation.hoursPerDay = v ?? 0))} unit={t('common.hours_day')} min={0} max={24} digits={0} />
              <NumberField label={t('op.safetyFactor')} value={sc.operation.safetyFactor} onChange={(v) => update((d) => (d.operation.safetyFactor = v ?? 0))} unit="%" min={0} max={100} digits={0} />
              <NumberField label={t('op.fanHeatPct')} value={sc.operation.fanHeatPct} onChange={(v) => update((d) => (d.operation.fanHeatPct = v ?? 0))} unit="%" min={0} max={30} digits={1} />
              <NumberField label={t('op.supplyDeltaT')} value={sc.operation.supplyDeltaT} onChange={(v) => update((d) => (d.operation.supplyDeltaT = v ?? 10))} quantity="dtemp" min={4} max={20} digits={1} />
            </div>
          </Card>
        </div>
        <aside className="aside">
          <ResultsCard load={L} safetyFactor={sc.operation.safetyFactor} />
        </aside>
      </div>

      <div className="section">
        <Card title={t('load.table')}>
          <DetailsTable load={L} />
        </Card>
      </div>
    </>
  )
}

function ResultsCard({ load: L, safetyFactor }: { load: LoadResult; safetyFactor: number }) {
  const t = useT()
  const u = useUnits()
  const alt = powerAlternatives(L.capacityKW)
  return (
    <Card title={t('load.results')} className="raised">
      <div className="stats">
        <Stat
          label={t('load.capacity')}
          big
          value={
            <>
              {u.val('power', L.capacityKW, 1)}
              <small>{u.label('power')}</small>
            </>
          }
          sub={`${u.n(alt.TR, 1)} TR · ${u.n(alt.BTUh / 1000, 0)} kBTU/h · ${u.n(alt.kcalh, 0)} kcal/h`}
        />
        <Stat label={t('load.room_sensible')} value={`${u.n(L.roomSensible, 0)} W`} sub={`${t('load.room_latent')}: ${u.n(L.roomLatent, 0)} W`} />
        <Stat label={t('load.oa_total')} value={`${u.n(L.outdoorSensible + L.outdoorLatent, 0)} W`} sub={u.show('airflow', L.outdoorM3h, 0)} />
        <Stat label={t('load.coil_total')} value={u.show('power', L.coilTotal / 1000, 2)} sub={`${t('load.safety')}: +${u.n(safetyFactor, 0)} %`} />
        <Stat label={t('load.shr')} value={u.n(L.shrRoom, 2)} />
        <Stat label={t('load.w_per_m2')} value={u.show('wpm2', L.wPerM2, 0)} sub={`${t('load.m2_per_tr')}: ${u.n(L.m2PerTR, 1)} m²/TR`} />
      </div>
      <Alerts warnings={L.warnings} />
      <div className="chart-title">{t('load.breakdown')}</div>
      <LoadDonut load={L} />
      <div className="chart-title">{t('load.by_item')}</div>
      <LoadBars load={L} />
    </Card>
  )
}

function DetailsTable({ load: L }: { load: LoadResult }) {
  const t = useT()
  const u = useUnits()
  const total = L.coilTotal
  return (
    <div className="table-wrap">
      <table className="kv">
        <thead>
          <tr>
            <th>{t('load.item')}</th>
            <th></th>
            <th className="num">{t('load.sensible')} (W)</th>
            <th className="num">{t('load.latent')} (W)</th>
            <th className="num">{t('common.total')} (W)</th>
            <th className="num">{t('load.share')}</th>
          </tr>
        </thead>
        <tbody>
          {L.items.map((i) => (
            <tr key={i.key}>
              <td>{itemLabel(i, t)}</td>
              <td className="muted" style={{ fontSize: 12 }}>
                {i.detail}
              </td>
              <td className="num">{u.n(i.sensible, 0)}</td>
              <td className="num">{u.n(i.latent, 0)}</td>
              <td className="num">{u.n(i.sensible + i.latent, 0)}</td>
              <td className="num">{total > 0 ? `${u.n((100 * (i.sensible + i.latent)) / total, 1)} %` : '—'}</td>
            </tr>
          ))}
          <tr className="sub">
            <td colSpan={2}>{t('load.room_total')}</td>
            <td className="num">{u.n(L.roomSensible, 0)}</td>
            <td className="num">{u.n(L.roomLatent, 0)}</td>
            <td className="num">{u.n(L.roomTotal, 0)}</td>
            <td></td>
          </tr>
          <tr className="sub">
            <td colSpan={2}>{t('load.oa_total')}</td>
            <td className="num">{u.n(L.outdoorSensible, 0)}</td>
            <td className="num">{u.n(L.outdoorLatent, 0)}</td>
            <td className="num">{u.n(L.outdoorSensible + L.outdoorLatent, 0)}</td>
            <td></td>
          </tr>
          <tr className="sub">
            <td colSpan={4}>{t('load.safety')}</td>
            <td className="num">{u.n(L.safetyW, 0)}</td>
            <td></td>
          </tr>
          <tr className="total">
            <td colSpan={4}>{t('load.capacity')}</td>
            <td className="num">{u.n(L.capacityW, 0)}</td>
            <td className="num">100 %</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
