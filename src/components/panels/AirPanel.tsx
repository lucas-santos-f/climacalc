import { Alerts, Card, Stat } from '../ui/Field'
import { useT, useUnits, type Computed } from '../../hooks'
import type { Scenario } from '../../engine/types'
import { PsychroChart } from '../charts/PsychroChart'

export function AirPanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const L = computed.load
  const A = L.air
  return (
    <div className="stack">
      <Card title={t('air.title')} hint={t('air.hint')}>
        <div className="stats">
          <Stat
            label={t('air.supply_flow')}
            big
            value={
              <>
                {u.val('airflow', A.supplyM3h, 0)}
                <small>{u.label('airflow')}</small>
              </>
            }
            sub={`${u.n(A.supplyLs, 0)} L/s · ${u.n(A.supplyKgS, 2)} kg/s`}
          />
          <Stat label={t('air.ach')} value={`${u.n(A.airChangesPerHour, 1)} /h`} />
          <Stat label={t('air.oa_flow')} value={u.show('airflow', A.outdoorM3h, 0)} sub={`${t('air.oa_fraction')}: ${u.n(A.outdoorFraction * 100, 0)} %`} />
          <Stat label={t('air.t_supply')} value={u.show('temp', A.tSupply, 1)} sub={`ΔT ${u.show('dtemp', sc.operation.supplyDeltaT, 1)}`} />
          <Stat label={t('air.w_supply')} value={`${u.n(A.wSupply * 1000, 2)} g/kg`} />
          <Stat label={t('air.adp')} value={A.adp !== null ? u.show('temp', A.adp, 1) : '—'} sub={A.bypassFactor !== null ? `${t('air.bypass')}: ${u.n(A.bypassFactor, 2)}` : undefined} />
          <Stat label={t('air.coil_shr')} value={u.n(A.coilSHR, 2)} />
          <Stat label={t('air.coil_load')} value={u.show('power', A.coilKW, 1)} sub={`${t('load.coil_total')}: ${u.show('power', L.coilTotal / 1000, 1)}`} />
        </div>
        <Alerts warnings={A.warnings} />
      </Card>

      <Card title={t('air.chart_title')}>
        <PsychroChart air={A} P={L.outdoor.P} />
      </Card>

      <Card title={t('air.states')} hint={`P = ${u.n(L.outdoor.P, 1)} kPa · ${u.show('length', sc.site.altitude, 0)}`}>
        <div className="table-wrap">
          <table className="kv">
            <thead>
              <tr>
                <th>{t('air.states')}</th>
                <th className="num">
                  {t('air.T')} ({u.label('temp')})
                </th>
                <th className="num">{t('air.W')} (g/kg)</th>
                <th className="num">{t('air.RH')} (%)</th>
                <th className="num">
                  {t('air.h')} ({u.label('enthalpy')})
                </th>
                <th className="num">
                  {t('air.Twb')} ({u.label('temp')})
                </th>
                <th className="num">
                  {t('air.Tdp')} ({u.label('temp')})
                </th>
              </tr>
            </thead>
            <tbody>
              {A.states.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.id}</b> <span className="muted">{t(`air.state.${s.id}`)}</span>
                  </td>
                  <td className="num">{u.val('temp', s.T, 1)}</td>
                  <td className="num">{u.n(s.W * 1000, 2)}</td>
                  <td className="num">{u.n(s.RH * 100, 0)}</td>
                  <td className="num">{u.val('enthalpy', s.h, 1)}</td>
                  <td className="num">{u.val('temp', s.Twb, 1)}</td>
                  <td className="num">{u.val('temp', s.Tdp, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
