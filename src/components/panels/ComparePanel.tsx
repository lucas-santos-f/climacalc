import { useMemo } from 'react'
import { Card, SafetyChip } from '../ui/Field'
import { CopBars, CopGwpScatter, type CompareRow } from '../charts/RefrigerantCompare'
import { useStore } from '../../state/store'
import { computeAll, useFluids, useT, useUnits, type Computed } from '../../hooks'
import type { CycleInput, Scenario } from '../../engine/types'
import { REFRIGERANTS } from '../../engine/refrigerants'
import { computeCycle } from '../../engine/cycle'
import { SYSTEM_PRESETS, cycleInputFor } from '../../engine/equipment'
import { fluidName } from '../../labels'

const K0 = 273.15
const ALL_IDS = REFRIGERANTS.map((r) => r.id)

// CO2 only makes sense transcritical once condensing gets warm
function adaptInput(base: CycleInput, id: string): CycleInput {
  const inp: CycleInput = { ...base, refrigerant: id }
  if (id === 'R744' && base.tCond > 22) return { ...inp, system: 'transcritical', transcritical: { tGasCoolerOut: base.tCond - 5, pGasCooler: null } }
  return inp
}

export function ComparePanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const scenarios = useStore((s) => s.scenarios)
  const { fluids, error } = useFluids(ALL_IDS)
  const Q = Math.max(computed.load.capacityKW, 0.1)
  const preset = SYSTEM_PRESETS[sc.equipment.system]

  const rows = useMemo<CompareRow[]>(() => {
    if (!fluids) return []
    const base = cycleInputFor(sc, preset)
    return REFRIGERANTS.map((meta) => {
      const input = adaptInput(base, meta.id)
      const common = { id: meta.id, name: fluidName(meta, t), color: meta.color, safety: meta.safety, gwp: meta.gwpAR4, typical: preset.refrigerants.includes(meta.id) }
      try {
        const r = computeCycle(input, Q, { main: fluids[meta.id] })
        return { ...common, ok: true, cop: r.COP, W: r.Wtotal, Tdis: Math.max(...r.stages.map((s) => s.Tdischarge)) - K0, Vdisp: r.stages.reduce((a, s) => a + s.Vdisplacement, 0) }
      } catch {
        return { ...common, ok: false, cop: 0, W: 0, Tdis: 0, Vdisp: 0 }
      }
    })
  }, [fluids, sc, preset, Q, t])

  const scenarioRows = useMemo(() => {
    if (!fluids) return []
    return scenarios.map((s) => ({ sc: s, c: computeAll(s, fluids) }))
  }, [scenarios, fluids])

  return (
    <div className="stack">
      <Card title={t('cmp.refrigerants')} hint={t('cmp.hint')}>
        {!fluids && !error && <div className="alert info">{t('cmp.loading')}</div>}
        {error && <div className="alert error">{error}</div>}
        {rows.length > 0 && (
          <div className="grid">
            <div>
              <CopBars rows={rows} highlight={sc.equipment.refrigerant} />
            </div>
            <div>
              <CopGwpScatter rows={rows} highlight={sc.equipment.refrigerant} />
            </div>
          </div>
        )}
        {rows.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="kv">
              <thead>
                <tr>
                  <th>{t('eq.refrigerant')}</th>
                  <th>{t('cmp.class')}</th>
                  <th className="num">{t('cmp.gwp')}</th>
                  <th className="num">{t('cmp.cop')}</th>
                  <th className="num">{t('cyc.W')}</th>
                  <th className="num">{t('cyc.Tdis')}</th>
                  <th className="num">{t('cyc.Vdisp')}</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .sort((a, b) => Number(b.ok) - Number(a.ok) || Number(b.typical) - Number(a.typical) || b.cop - a.cop)
                  .map((r) => (
                    <tr key={r.id} className={r.id === sc.equipment.refrigerant ? 'current' : r.typical && r.ok ? undefined : 'dim'}>
                      <td>
                        {r.typical ? '★ ' : ''}
                        {r.name}
                      </td>
                      <td>
                        <SafetyChip cls={r.safety} />
                      </td>
                      <td className="num">{r.gwp}</td>
                      <td className="num">{r.ok ? u.n(r.cop, 2) : t('cmp.not_applicable')}</td>
                      <td className="num">{r.ok ? u.show('power', r.W, 1) : '—'}</td>
                      <td className="num">{r.ok ? u.show('temp', r.Tdis, 0) : '—'}</td>
                      <td className="num">{r.ok ? u.show('airflow', r.Vdisp, 1) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t('cmp.scenarios')}>
        {scenarioRows.length < 2 && <div className="empty">{t('cmp.no_scenarios')}</div>}
        {scenarioRows.length > 0 && (
          <div className="table-wrap" style={scenarioRows.length < 2 ? { marginTop: 12 } : undefined}>
            <table className="kv">
              <thead>
                <tr>
                  <th>{t('scenario.name')}</th>
                  <th>{t('scenario.environment')}</th>
                  <th className="num">{t('cmp.area')}</th>
                  <th className="num">
                    {t('cmp.capacity')} ({u.label('power')})
                  </th>
                  <th className="num">{t('cmp.w_per_m2')}</th>
                  <th className="num">{t('load.shr')}</th>
                  <th>{t('cmp.system')}</th>
                  <th>{t('eq.refrigerant')}</th>
                  <th className="num">{t('cmp.power')}</th>
                  <th className="num">{t('cmp.kw_tr')}</th>
                </tr>
              </thead>
              <tbody>
                {scenarioRows.map(({ sc: s, c }) => (
                  <tr key={s.id} className={s.id === sc.id ? 'current' : undefined}>
                    <td>{s.name}</td>
                    <td>{t(`environment.${s.environment}`)}</td>
                    <td className="num">{u.n(c.load.geometry.floorArea, 0)}</td>
                    <td className="num">{u.val('power', c.load.capacityKW, 1)}</td>
                    <td className="num">{u.n(c.load.wPerM2, 0)}</td>
                    <td className="num">{u.n(c.load.shrRoom, 2)}</td>
                    <td>{t(`eq.system.${s.equipment.system}`)}</td>
                    <td>{s.equipment.refrigerant}</td>
                    <td className="num">{u.n(c.equipment.electrical.totalKW, 1)}</td>
                    <td className="num">{u.n(c.equipment.electrical.kWPerTR, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
