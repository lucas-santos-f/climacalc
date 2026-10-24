import { useMemo } from 'react'
import { Alerts, Card, CheckField, NumberField, SafetyChip, SelectField, Stat } from '../ui/Field'
import { useStore } from '../../state/store'
import { useT, useUnits, type Computed } from '../../hooks'
import type { CompressorType, HvacSystem, Scenario } from '../../engine/types'
import { SYSTEMS } from '../../engine/presets'
import { SYSTEM_PRESETS } from '../../engine/equipment'
import { REFRIGERANTS, refrigerantMeta } from '../../engine/refrigerants'
import { computeLoad } from '../../engine/hvac'
import { PhDiagram } from '../charts/PhDiagram'
import { LoadSensitivity, type SweepPoint } from '../charts/Sensitivity'

const K0 = 273.15
const COMPRESSORS: CompressorType[] = ['scroll', 'reciprocating', 'screw']

export function EquipmentPanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const E = computed.equipment
  const cycle = computed.cycle
  const fluid = computed.fluids?.[sc.equipment.refrigerant]
  const preset = SYSTEM_PRESETS[sc.equipment.system]
  const meta = refrigerantMeta(sc.equipment.refrigerant)
  const isChiller = sc.equipment.system === 'chiller_air' || sc.equipment.system === 'chiller_water'

  const refOptions = useMemo(() => {
    const typical = preset.refrigerants
    return REFRIGERANTS.slice()
      .sort((a, b) => Number(typical.includes(b.id)) - Number(typical.includes(a.id)))
      .map((r) => ({ value: r.id, label: `${typical.includes(r.id) ? '★ ' : ''}${r.name} · ${r.safety} · GWP ${r.gwpAR4}` }))
  }, [preset])

  const sweepExt = useMemo<SweepPoint[]>(() => {
    const pts: SweepPoint[] = []
    for (let d = -8; d <= 8; d += 1) {
      const s = structuredClone(sc)
      s.site.tExt = sc.site.tExt + d
      s.site.twbExt = Math.min(sc.site.twbExt + d * 0.6, s.site.tExt - 0.5)
      const L = computeLoad(s)
      pts.push({ x: s.site.tExt, capacityKW: L.capacityKW, sensibleKW: (L.roomSensible + L.outdoorSensible) / 1000, latentKW: (L.roomLatent + L.outdoorLatent) / 1000 })
    }
    return pts
  }, [sc])

  const sweepInt = useMemo<SweepPoint[]>(() => {
    const pts: SweepPoint[] = []
    for (let tInt = 20; tInt <= 28; tInt += 1) {
      const s = structuredClone(sc)
      s.site.tInt = tInt
      const L = computeLoad(s)
      pts.push({ x: tInt, capacityKW: L.capacityKW, sensibleKW: (L.roomSensible + L.outdoorSensible) / 1000, latentKW: (L.roomLatent + L.outdoorLatent) / 1000 })
    }
    return pts
  }, [sc])

  const noteKey = `eq.note.${meta.safety}`
  const note = t(noteKey) !== noteKey ? t(noteKey) : null

  return (
    <div className="grid wide">
      <Card title={t('eq.title')}>
        <div className="fields">
          <SelectField
            label={t('eq.system')}
            value={sc.equipment.system}
            onChange={(v) =>
              update((d) => {
                d.equipment.system = v as HvacSystem
                const p = SYSTEM_PRESETS[d.equipment.system]
                if (!p.refrigerants.includes(d.equipment.refrigerant)) d.equipment.refrigerant = p.refrigerants[0]
                d.equipment.compressorType = v === 'chiller_air' || v === 'chiller_water' ? 'screw' : 'scroll'
                d.equipment.nUnits = null
              })
            }
            options={SYSTEMS.map((s) => ({ value: s, label: t(`eq.system.${s}`) }))}
          />
          <SelectField label={t('eq.refrigerant')} value={sc.equipment.refrigerant} onChange={(v) => update((d) => (d.equipment.refrigerant = v))} options={refOptions} />
          <NumberField label={`${t('eq.copOverride')} (${preset.copLabel})`} value={sc.equipment.copOverride} onChange={(v) => update((d) => (d.equipment.copOverride = v))} unit="kW/kW" nullable autoHint={u.n(preset.cop, 2)} min={1} max={12} />
          <NumberField label={t('eq.nUnits')} value={sc.equipment.nUnits} onChange={(v) => update((d) => (d.equipment.nUnits = v))} unit="" nullable autoHint={String(E.units.operating)} min={1} max={200} digits={0} />
          <CheckField label={t('eq.standby')} checked={sc.equipment.standby} onChange={(v) => update((d) => (d.equipment.standby = v))} />
          {isChiller && (
            <>
              <NumberField label={t('eq.chwSupply')} value={sc.equipment.chwSupply} onChange={(v) => update((d) => (d.equipment.chwSupply = v ?? 7))} quantity="temp" min={2} max={20} digits={1} />
              <NumberField label={t('eq.chwDeltaT')} value={sc.equipment.chwDeltaT} onChange={(v) => update((d) => (d.equipment.chwDeltaT = v ?? 5.6))} quantity="dtemp" min={2} max={12} digits={1} />
            </>
          )}
          <NumberField label={t('eq.condApproach')} value={sc.equipment.condApproach} onChange={(v) => update((d) => (d.equipment.condApproach = v ?? 12))} quantity="dtemp" min={3} max={30} digits={1} />
          <SelectField label={t('eq.compressorType')} value={sc.equipment.compressorType} onChange={(v) => update((d) => (d.equipment.compressorType = v as CompressorType))} options={COMPRESSORS.map((c) => ({ value: c, label: t(`comp.${c}`) }))} />
          <NumberField label={t('eq.superheat')} value={sc.equipment.superheat} onChange={(v) => update((d) => (d.equipment.superheat = v ?? 5))} quantity="dtemp" min={0} max={30} digits={1} />
          <NumberField label={t('eq.subcooling')} value={sc.equipment.subcooling} onChange={(v) => update((d) => (d.equipment.subcooling = v ?? 3))} quantity="dtemp" min={0} max={30} digits={1} />
          <NumberField label={t('eq.powerFactor')} value={sc.equipment.powerFactor} onChange={(v) => update((d) => (d.equipment.powerFactor = v ?? 0.92))} unit="—" min={0.6} max={1} />
          <NumberField label={t('eq.voltage')} value={sc.equipment.voltage} onChange={(v) => update((d) => (d.equipment.voltage = v ?? 380))} unit="V" min={100} max={15000} digits={0} />
          <NumberField label={t('eq.chargeKgPerKW')} value={sc.equipment.chargeKgPerKW} onChange={(v) => update((d) => (d.equipment.chargeKgPerKW = v))} quantity="kgperkw" nullable autoHint={u.val('kgperkw', preset.chargeKgPerKW, 2)} min={0} max={10} />
        </div>
      </Card>

      <Card title={t('eq.results')}>
        <div className="stats">
          <Stat
            label={t('eq.capacity')}
            big
            value={
              <>
                {u.val('power', E.capacityKW, 1)}
                <small>{u.label('power')}</small>
              </>
            }
            sub={t(`eq.system.${E.system}`)}
          />
          <Stat label={t('eq.unit_size')} value={E.units.unitLabel} sub={`${u.show('power', E.units.unitKW, 1)} × ${E.units.operating} ${t('eq.operating').toLowerCase()} · ${E.units.installed} ${t('eq.installed').toLowerCase()}`} />
          {E.units.indoorUnitKW > 0 && <Stat label={t('eq.indoor_units')} value={E.units.indoorUnits} sub={`≈ ${u.show('power', E.units.indoorUnitKW, 1)} ${t('common.value').toLowerCase()}`} />}
          <Stat label={t('eq.cop_nominal')} value={u.n(E.cop.nominal, 2)} sub={preset.copLabel} />
          <Stat label={t('eq.cop_cycle')} value={E.cop.cycle !== null ? u.n(E.cop.cycle, 2) : '—'} sub={`${t('eq.cond_conditions')}: ${u.val('temp', E.cop.tEvap, 0)} / ${u.show('temp', E.cop.tCond, 0)}`} />
        </div>
        <Alerts warnings={E.warnings} error={computed.cycleError} />
        <h3 style={{ margin: '12px 0 6px', fontSize: '0.95rem' }}>{t('eq.electrical')}</h3>
        <table className="kv">
          <tbody>
            <tr>
              <td>{t('eq.compressorsKW')}</td>
              <td className="num">{u.n(E.electrical.compressorsKW, 1)} kW</td>
            </tr>
            <tr>
              <td>{t('eq.fansKW')}</td>
              <td className="num">{u.n(E.electrical.fansKW, 1)} kW</td>
            </tr>
            {E.electrical.pumpsKW > 0 && (
              <tr>
                <td>{t('eq.pumpsKW')}</td>
                <td className="num">{u.n(E.electrical.pumpsKW, 1)} kW</td>
              </tr>
            )}
            {E.electrical.towerKW > 0 && (
              <tr>
                <td>{t('eq.towerKW')}</td>
                <td className="num">{u.n(E.electrical.towerKW, 1)} kW</td>
              </tr>
            )}
            <tr className="total">
              <td>{t('eq.totalKW')}</td>
              <td className="num">{u.n(E.electrical.totalKW, 1)} kW</td>
            </tr>
            <tr>
              <td>{t('eq.kVA')}</td>
              <td className="num">{u.n(E.electrical.kVA, 1)} kVA</td>
            </tr>
            <tr>
              <td>
                {t('eq.amps')} ({u.n(sc.equipment.voltage, 0)} V)
              </td>
              <td className="num">{u.n(E.electrical.amps, 0)} A</td>
            </tr>
            <tr>
              <td>{t('eq.transformer')}</td>
              <td className="num">{u.n(E.electrical.transformerKVA, 1)} kVA</td>
            </tr>
            <tr>
              <td>{t('eq.kWPerTR')}</td>
              <td className="num">{u.n(E.electrical.kWPerTR, 2)} kW/TR</td>
            </tr>
            <tr>
              <td>{t('eq.kWhDay')}</td>
              <td className="num">{u.show('energy', E.electrical.kWhDay, 0)}</td>
            </tr>
          </tbody>
        </table>
        <h3 style={{ margin: '12px 0 6px', fontSize: '0.95rem' }}>{t('eq.water')}</h3>
        <table className="kv">
          <tbody>
            <tr>
              <td>{t('eq.heat_rejection')}</td>
              <td className="num">{u.show('power', E.water.heatRejectionKW, 1)}</td>
            </tr>
            {E.water.chwFlowM3h !== undefined && (
              <tr>
                <td>{t('eq.chw_flow')}</td>
                <td className="num">{u.show('waterflow', E.water.chwFlowM3h, 1)}</td>
              </tr>
            )}
            {E.water.cwFlowM3h !== undefined && (
              <tr>
                <td>{t('eq.cw_flow')}</td>
                <td className="num">{u.show('waterflow', E.water.cwFlowM3h, 1)}</td>
              </tr>
            )}
            {E.water.makeupM3h !== undefined && (
              <tr>
                <td>{t('eq.makeup')}</td>
                <td className="num">{u.show('waterflow', E.water.makeupM3h, 2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card
        title={t('eq.refrigerant_section')}
        right={
          <span>
            {meta.name} <SafetyChip cls={meta.safety} />
          </span>
        }
      >
        <table className="kv">
          <tbody>
            <tr>
              <td>{t('eq.charge')}</td>
              <td className="num">
                {u.show('mass', E.refrigerant.chargeKg, 1)} ({u.show('kgperkw', E.refrigerant.chargeKgPerKW, 2)})
              </td>
            </tr>
            <tr>
              <td>{t('eq.per_circuit')}</td>
              <td className="num">{u.show('mass', E.refrigerant.chargePerCircuitKg, 1)}</td>
            </tr>
            <tr>
              <td>
                {t('eq.co2e')} (GWP {meta.gwpAR4})
              </td>
              <td className="num">{u.n(E.refrigerant.co2eTon, 1)} t CO₂e</td>
            </tr>
            {E.refrigerant.roomChargeLimitKg !== null && (
              <tr>
                <td>{t('eq.room_limit')}</td>
                <td className="num">{u.show('mass', E.refrigerant.roomChargeLimitKg, 2)}</td>
              </tr>
            )}
            {E.refrigerant.ventilationEmergencyM3h !== null && (
              <tr>
                <td>{t('eq.vent_emergency')}</td>
                <td className="num">{u.show('airflow', E.refrigerant.ventilationEmergencyM3h, 0)}</td>
              </tr>
            )}
            {E.space.indoorAreaM2 !== null && (
              <tr>
                <td>{t('eq.indoor_area')}</td>
                <td className="num">{u.show('area', E.space.indoorAreaM2, 0)}</td>
              </tr>
            )}
            <tr>
              <td>{t('eq.outdoor_area')}</td>
              <td className="num">{u.show('area', E.space.outdoorAreaM2, 0)}</td>
            </tr>
          </tbody>
        </table>
        <h3 style={{ margin: '12px 0 6px', fontSize: '0.95rem' }}>{t('eq.safety_notes')}</h3>
        <div className="prose" style={{ fontSize: '0.85rem' }}>
          {note && <p>{note}</p>}
          <p className="muted">{t('eq.norms')}</p>
        </div>
      </Card>

      <Card title={t('eq.sensitivity')}>
        <h3 style={{ fontSize: '0.88rem', marginBottom: 4 }}>{t('eq.sens_text')}</h3>
        <LoadSensitivity data={sweepExt} xLabel={t('site.tExt')} current={sc.site.tExt} />
        <h3 style={{ fontSize: '0.88rem', margin: '10px 0 4px' }}>{t('eq.sens_tint')}</h3>
        <LoadSensitivity data={sweepInt} xLabel={t('site.tInt')} current={sc.site.tInt} />
      </Card>

      <Card title={`${t('eq.cycle_title')} — ${t('eq.ph_title')}`} className="span-2" hint={`${t('cyc.tEvap')} ${u.show('temp', E.cop.tEvap, 0)} · ${t('cyc.tCond')} ${u.show('temp', E.cop.tCond, 0)} · ${t('eq.superheat')} ${u.show('dtemp', sc.equipment.superheat, 0)} · ${t('eq.subcooling')} ${u.show('dtemp', sc.equipment.subcooling, 0)}`}>
        {computed.loading && <div className="alert info">{t('common.loading')}</div>}
        {cycle && fluid && (
          <div className="grid">
            <div>
              <PhDiagram fluid={fluid} cycle={cycle} />
            </div>
            <div>
              <div className="stats">
                <Stat label={t('cyc.cop')} value={u.n(cycle.COP, 2)} sub={`Carnot ${u.n(cycle.COPCarnot, 2)} · η₂ ${u.n(cycle.secondLawEff * 100, 0)} %`} />
                <Stat label={t('cyc.W')} value={u.show('power', cycle.Wtotal, 1)} />
                <Stat label={t('cyc.Tdis')} value={u.show('temp', cycle.stages[0].Tdischarge - K0, 0)} />
                <Stat label={t('cyc.pr')} value={u.n(cycle.stages[0].pressureRatio, 2)} sub={`${u.show('pressure', cycle.Pevap, 2)} → ${u.show('pressure', cycle.Pcond, 2)}`} />
                <Stat label={t('cyc.mdot')} value={u.show('massflow', cycle.stages[0].mdot, 3)} />
                <Stat label={t('cyc.Vdisp')} value={`${u.n(cycle.stages[0].Vdisplacement * 3600, 1)} m³/h`} sub={`η_is ${u.n(cycle.stages[0].etaIs * 100, 0)} % · η_vol ${u.n(cycle.stages[0].etaVol * 100, 0)} %`} />
              </div>
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="kv">
                  <thead>
                    <tr>
                      <th>{t('cyc.points')}</th>
                      <th className="num">
                        P ({u.label('pressure')})
                      </th>
                      <th className="num">
                        T ({u.label('temp')})
                      </th>
                      <th className="num">
                        h ({u.label('enthalpy')})
                      </th>
                      <th>—</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycle.points.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <b>{p.id}</b>
                        </td>
                        <td className="num">{u.val('pressure', p.P, 2)}</td>
                        <td className="num">{u.val('temp', p.T - K0, 1)}</td>
                        <td className="num">{u.val('enthalpy', p.h, 1)}</td>
                        <td className="muted">{t(`cyc.region.${p.region}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Alerts warnings={cycle.warnings} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
