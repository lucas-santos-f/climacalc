import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { PALETTE, chartColors } from './theme'
import type { LoadGroup, LoadResult } from '../../engine/types'
import { useT, useTheme, useUnits } from '../../hooks'
import { itemLabel } from '../../labels'

const GROUP_ORDER: LoadGroup[] = ['envelope', 'solar', 'people', 'lights', 'equipment', 'infiltration', 'fan', 'outdoor_air']
const GROUP_COLOR: Record<LoadGroup, string> = { envelope: PALETTE[0], solar: PALETTE[3], people: PALETTE[2], lights: PALETTE[7], equipment: PALETTE[4], infiltration: PALETTE[1], fan: PALETTE[9], outdoor_air: PALETTE[6] }

export function LoadDonut({ load }: { load: LoadResult }) {
  const t = useT()
  const theme = useTheme()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const data = GROUP_ORDER.filter((g) => load.byGroup[g].sensible + load.byGroup[g].latent > 0).map((g) => ({ name: t(`load.group.${g}`), value: Math.round(load.byGroup[g].sensible + load.byGroup[g].latent), itemStyle: { color: GROUP_COLOR[g] } }))
    return {
      animation: false,
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${p.value.toLocaleString()} W (${p.percent.toFixed(0)} %)` },
      legend: { bottom: 0, textStyle: { color: c.text, fontSize: 11 } },
      series: [{ type: 'pie', radius: ['42%', '70%'], center: ['50%', '42%'], data, label: { formatter: '{d}%', color: c.text, fontSize: 11 }, itemStyle: { borderColor: c.surface, borderWidth: 2 } }],
    }
  }, [load, t, theme])
  return <EChart option={option} className="chart" />
}

/** Barras empilhadas sensível / latente por parcela. */
export function LoadBars({ load }: { load: LoadResult }) {
  const t = useT()
  const theme = useTheme()
  const u = useUnits()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const items = load.items.slice().sort((a, b) => a.sensible + a.latent - (b.sensible + b.latent))
    const names = items.map((i) => itemLabel(i, t))
    return {
      animation: false,
      grid: { left: 8, right: 70, top: 28, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: c.text, fontSize: 11 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${u.n(v, 0)} W` },
      xAxis: { type: 'value', name: 'W', axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: c.text, fontSize: 11, width: 150, overflow: 'truncate' }, axisLine: { lineStyle: { color: c.grid } } },
      series: [
        { type: 'bar', name: t('load.sensible'), stack: 'x', data: items.map((i) => ({ value: Math.round(i.sensible), itemStyle: { color: GROUP_COLOR[i.group] } })), barMaxWidth: 20 },
        { type: 'bar', name: t('load.latent'), stack: 'x', data: items.map((i) => ({ value: Math.round(i.latent), itemStyle: { color: GROUP_COLOR[i.group], opacity: 0.45 } })), barMaxWidth: 20, label: { show: true, position: 'right', color: c.text, fontSize: 10, formatter: (p: { dataIndex: number }) => u.n(items[p.dataIndex].sensible + items[p.dataIndex].latent, 0) } },
      ],
    }
  }, [load, t, theme, u])
  const h = Math.max(240, 26 * load.items.length + 60)
  return (
    <div style={{ height: h }}>
      <EChart option={option} className="chart" />
    </div>
  )
}
