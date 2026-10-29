import type { AirResult, AirState } from '../../engine/types'
import { useT, useUnits } from '../../hooks'

// same colors as the points on the psychrometric chart
const COLOR: Record<string, string> = { OA: '#dc2626', RA: '#15803d', MA: '#d97706', SA: '#2563eb', ADP: '#7c3aed' }

const X_MIX = 100
const Y_DUCT = 100
const Y_RET = 172
const COIL_L = 165
const COIL_R = 225
const X_SA = 272
const ROOM_L = 318
const ROOM_R = 408
const X_ROOM = (ROOM_L + ROOM_R) / 2

function arrow(x: number, y: number, dir: 'down' | 'up' | 'left' | 'right'): string {
  const s = 5
  if (dir === 'left') return `M${x + s},${y - s} L${x - 2},${y} L${x + s},${y + s}`
  if (dir === 'right') return `M${x - s},${y - s} L${x + 2},${y} L${x - s},${y + s}`
  if (dir === 'up') return `M${x - s},${y + s} L${x},${y - 2} L${x + s},${y + s}`
  return `M${x - s},${y - s} L${x},${y + 2} L${x + s},${y - s}`
}

// Outdoor and return air mixing, the coil and the room, with the state at each point.
export function AirSchematic({ air }: { air: AirResult }) {
  const t = useT()
  const u = useUnits()
  const s = Object.fromEntries(air.states.map((x) => [x.id, x])) as Record<string, AirState | undefined>
  const state = (id: string) => {
    const p = s[id]
    return p ? `${u.show('temp', p.T, 1)} · ${u.n(p.RH * 100, 0)} %` : '—'
  }
  const returnM3h = Math.max(0, air.supplyM3h - air.outdoorM3h)
  const tag = (id: string) => (
    <tspan className="code" style={{ fill: COLOR[id] }}>
      {id}{' '}
    </tspan>
  )
  const dot = (id: string, x: number, y: number) => <circle className="node" cx={x} cy={y} r={5.5} style={{ fill: COLOR[id] }} />

  return (
    <div className="schematic-wrap">
      <svg className="schematic air" viewBox="0 0 420 212" role="img" aria-label={t('path.title')}>
        <g className="line">
          <path d={`M${X_MIX},34 V${Y_DUCT}`} style={{ stroke: COLOR.OA }} />
          <path d={arrow(X_MIX, 64, 'down')} style={{ stroke: COLOR.OA }} />
          <path d={`M${X_MIX},${Y_DUCT} H${COIL_L}`} style={{ stroke: COLOR.MA }} />
          <path d={arrow(136, Y_DUCT, 'right')} style={{ stroke: COLOR.MA }} />
          <path d={`M${COIL_R},${Y_DUCT} H${ROOM_L}`} style={{ stroke: COLOR.SA }} />
          <path d={arrow(300, Y_DUCT, 'right')} style={{ stroke: COLOR.SA }} />
          <g className={returnM3h < 1 ? 'off' : undefined} style={{ stroke: COLOR.RA }}>
            <path d={`M${X_ROOM},134 V${Y_RET} H${X_MIX} V${Y_DUCT}`} />
            <path d={arrow(296, Y_RET, 'left')} />
            <path d={arrow(X_MIX, 142, 'up')} />
            <path d={`M${X_ROOM},${Y_RET} H${ROOM_R - 6}`} />
            <path d={arrow(ROOM_R - 8, Y_RET, 'right')} />
          </g>
        </g>

        <rect className="box cold" x={COIL_L} y={Y_DUCT - 15} width={COIL_R - COIL_L} height={30} rx={5} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} className="fin" x1={COIL_L + 9 + i * 7} y1={Y_DUCT - 10} x2={COIL_L + 9 + i * 7} y2={Y_DUCT + 10} />
        ))}
        <text x={(COIL_L + COIL_R) / 2} y={Y_DUCT + 32} textAnchor="middle" className="part-name">
          {t('path.coil')}
        </text>
        <text x={(COIL_L + COIL_R) / 2} y={Y_DUCT + 46} textAnchor="middle" className="num">
          {tag('ADP')}
          {s.ADP ? u.show('temp', s.ADP.T, 1) : '—'}
        </text>

        <rect className="room" x={ROOM_L} y={66} width={ROOM_R - ROOM_L} height={68} rx={8} />
        <text x={X_ROOM} y={95} textAnchor="middle" className="name">
          {t('path.room')}
        </text>
        <text x={X_ROOM} y={112} textAnchor="middle" className="num">
          {state('RA')}
        </text>

        <text x={X_MIX + 12} y={30}>
          {tag('OA')}
          <tspan className="part-name">{t('path.outdoor')}</tspan>
        </text>
        <text x={X_MIX + 12} y={45} className="num">
          {state('OA')} · {u.show('airflow', air.outdoorM3h, 0)}
        </text>

        <text x={X_MIX - 12} y={124} textAnchor="end">
          {tag('MA')}
          <tspan className="part-name">{t('path.mixed')}</tspan>
        </text>
        <text x={X_MIX - 12} y={139} textAnchor="end" className="num">
          {state('MA')}
        </text>

        <text x={X_SA} y={72} textAnchor="middle">
          {tag('SA')}
          <tspan className="part-name">{t('path.supply')}</tspan>
        </text>
        <text x={X_SA} y={87} textAnchor="middle" className="num">
          {state('SA')}
        </text>
        <text x={X_SA} y={Y_DUCT + 20} textAnchor="middle" className="dim num">
          {u.show('airflow', air.supplyM3h, 0)}
        </text>

        <text x={232} y={Y_RET + 18} textAnchor="middle">
          {tag('RA')}
          <tspan className="part-name">{t('path.return')}</tspan>
        </text>
        <text x={232} y={Y_RET + 33} textAnchor="middle" className="dim num">
          {u.show('airflow', returnM3h, 0)}
        </text>
        <text x={ROOM_R} y={Y_RET + 18} textAnchor="end" className="dim">
          {t('path.exhaust')}
        </text>

        {dot('OA', X_MIX, 34)}
        {dot('MA', X_MIX, Y_DUCT)}
        {dot('SA', X_SA, Y_DUCT)}
        {dot('RA', 232, Y_RET)}
      </svg>
    </div>
  )
}
