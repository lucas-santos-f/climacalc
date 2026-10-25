import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { chartColors } from './theme'
import type { AirResult } from '../../engine/types'
import { useT, useTheme, useUnits } from '../../hooks'
import { wFromRh, wSat } from '../../engine/psychro'
import { toDisplay, unitLabel } from '../../units'

const STATE_COLOR: Record<string, string> = { OA: '#dc2626', RA: '#15803d', MA: '#d97706', SA: '#2563eb', ADP: '#7c3aed' }

// Psychrometric chart (dry-bulb vs humidity ratio) with the mixing and cooling process drawn on it.
export function PsychroChart({ air, P }: { air: AirResult; P: number }) {
  const t = useT()
  const theme = useTheme()
  const { sys } = useUnits()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const tx = (T: number) => Math.round(toDisplay('temp', T, sys) * 10) / 10
    const Tmin = 0
    const Tmax = Math.max(40, Math.ceil(Math.max(...air.states.map((s) => s.T)) / 5) * 5 + 5)
    const Wmax = Math.max(22, Math.ceil(Math.max(...air.states.map((s) => s.W * 1000)) / 2) * 2 + 4)
    const rhSeries: object[] = []
    for (const rh of [1, 0.8, 0.6, 0.4, 0.2]) {
      const data: [number, number][] = []
      for (let T = Tmin; T <= Tmax; T += 1) {
        const w = (rh === 1 ? wSat(T, P) : wFromRh(T, rh, P)) * 1000
        if (w > Wmax) break
        data.push([tx(T), Math.round(w * 100) / 100])
      }
      rhSeries.push({
        type: 'line',
        name: `${rh * 100} %`,
        data,
        symbol: 'none',
        smooth: true,
        silent: true,
        tooltip: { show: false },
        lineStyle: { color: rh === 1 ? c.accent : c.muted, width: rh === 1 ? 2 : 0.8, opacity: rh === 1 ? 1 : 0.6, type: rh === 1 ? 'solid' : 'dashed' },
        endLabel: { show: true, formatter: `${rh * 100}%`, color: c.muted, fontSize: 10 },
        z: 1,
      })
    }
    const st = (id: string) => air.states.find((s) => s.id === id)
    const pt = (id: string) => {
      const s = st(id)
      return s ? [tx(s.T), Math.round(s.W * 100000) / 100] : null
    }
    const lines: object[] = []
    const seg = (a: string, b: string, color: string, dashed = false) => {
      const pa = pt(a)
      const pb = pt(b)
      if (pa && pb) lines.push({ type: 'line', name: `${a}-${b}`, data: [pa, pb], symbol: 'none', silent: true, tooltip: { show: false }, lineStyle: { color, width: 2, type: dashed ? 'dashed' : 'solid' }, z: 3 })
    }
    seg('OA', 'RA', c.muted, true)
    seg('MA', 'SA', '#2563eb')
    seg('SA', 'ADP', '#7c3aed', true)
    seg('SA', 'RA', '#15803d')
    const points = air.states.map((s) => ({ name: s.id, value: [tx(s.T), Math.round(s.W * 100000) / 100], RH: s.RH, h: s.h, Twb: s.Twb, itemStyle: { color: STATE_COLOR[s.id] ?? c.primary, borderColor: c.surface, borderWidth: 1.5 } }))
    return {
      animation: false,
      grid: { left: 52, right: 60, top: 18, bottom: 44 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { data: { name: string; value: number[]; RH: number; h: number; Twb: number } }) => (p.data?.name ? `<b>${t(`air.state.${p.data.name}`)}</b><br/>T = ${p.data.value[0]} ${unitLabel('temp', sys)} · W = ${p.data.value[1]} g/kg<br/>${t('air.RH')} = ${(p.data.RH * 100).toFixed(0)} % · h = ${toDisplay('enthalpy', p.data.h, sys).toFixed(1)} ${unitLabel('enthalpy', sys)} · ${t('air.Twb')} = ${tx(p.data.Twb)} ${unitLabel('temp', sys)}` : ''),
      },
      xAxis: { type: 'value', name: `${t('air.chart_x')} (${unitLabel('temp', sys)})`, nameLocation: 'middle', nameGap: 26, min: tx(Tmin), max: tx(Tmax), axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } } },
      yAxis: { type: 'value', name: `${t('air.chart_y')} (g/kg)`, position: 'right', min: 0, max: Wmax, axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } } },
      series: [...rhSeries, ...lines, { type: 'scatter', name: 'states', data: points, symbolSize: 12, label: { show: true, formatter: (p: { data: { name: string } }) => p.data.name, position: 'top', color: c.text, fontWeight: 'bold', fontSize: 11 }, z: 5 }],
    }
  }, [air, P, t, theme, sys])
  return <EChart option={option} className="chart tall" />
}
