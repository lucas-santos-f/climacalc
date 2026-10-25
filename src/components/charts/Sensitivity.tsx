import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { chartColors } from './theme'
import { useT, useTheme, useUnits } from '../../hooks'
import { toDisplay, unitLabel } from '../../units'

export interface SweepPoint {
  x: number // °C
  capacityKW: number
  sensibleKW: number
  latentKW: number
}

// Load (kW) as a function of one temperature, split into sensible and latent.
export function LoadSensitivity({ data, xLabel, current }: { data: SweepPoint[]; xLabel: string; current: number }) {
  const t = useT()
  const theme = useTheme()
  const { sys } = useUnits()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const tx = (v: number) => String(Math.round(toDisplay('temp', v, sys) * 10) / 10)
    const p = (v: number) => Math.round(toDisplay('power', v, sys) * 100) / 100
    return {
      animation: false,
      grid: { left: 52, right: 20, top: 30, bottom: 40 },
      legend: { top: 0, textStyle: { color: c.text, fontSize: 11 } },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} ${unitLabel('power', sys)}` },
      xAxis: { type: 'category', data: data.map((d) => tx(d.x)), name: `${xLabel} (${unitLabel('temp', sys)})`, nameLocation: 'middle', nameGap: 26, axisLabel: { color: c.muted }, axisLine: { lineStyle: { color: c.grid } } },
      yAxis: { type: 'value', name: unitLabel('power', sys), axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } } },
      series: [
        { type: 'line', name: t('load.capacity'), data: data.map((d) => p(d.capacityKW)), smooth: true, symbol: 'none', lineStyle: { width: 2.5, color: c.primary }, itemStyle: { color: c.primary }, markLine: { symbol: 'none', data: [{ xAxis: tx(current) }], lineStyle: { color: '#dc2626', type: 'dashed' }, label: { show: false } } },
        { type: 'line', name: t('load.sensible'), data: data.map((d) => p(d.sensibleKW)), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#d97706' }, itemStyle: { color: '#d97706' } },
        { type: 'line', name: t('load.latent'), data: data.map((d) => p(d.latentKW)), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#0891b2' }, itemStyle: { color: '#0891b2' } },
      ],
    }
  }, [data, xLabel, current, t, theme, sys])
  return <EChart option={option} className="chart short" />
}
