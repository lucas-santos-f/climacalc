import { Card } from '../ui/Field'
import { useT } from '../../hooks'

const FORMULAS = [
  'Q_wall = U·A·CLTD_corr,  CLTD_corr = CLTD·f_mass·f_colour + (25.5 − T_int) + (T_ext − ΔT_daily/2 − 29.4)',
  'Q_glass = U·A·(T_ext − T_int) + A·SHGF·SHGC·f_shade·CLF',
  'Q_people = n·(q_sens + q_lat)·f_div,  Q_lights = W/m²·A·f_ballast·f_div,  Q_equip = (W/m²·A + kW)·f_div',
  'Q_air = ṁ·cp·ΔT (sensible) + ṁ·Δw·2501 kJ/kg (latent),  ṁ = V̇ / v_out',
  'V̇_supply = Q_sens,room / (ρ·cp·ΔT_supply),  w_supply = w_room − Q_lat / (ṁ·2501)',
  'Mixing: T_m = T_room + f_oa·(T_out − T_room);  ADP where the mix → supply line meets saturation;  BF = (T_supply − T_ADP) / (T_m − T_ADP)',
  'P_compressor = Q_cap / COP,  P_fan = SFP·V̇,  kVA = kW / PF,  I = kVA·1000 / (√3·V)',
  'A2L/A3 room charge limit: m_max = 2.5·LFL^(5/4)·h₀·√A  (IEC 60335-2-40);  emergency ventilation 70·√G L/s  (ASHRAE 15)',
  'Cycle: ṁ = Q / (h₁ − h₄),  h₂ = h₁ + (h₂ₛ − h₁) / η_is,  COP = Q / W,  V̇_disp = ṁ·v₁ / η_vol',
]

export function AboutPanel() {
  const t = useT()
  return (
    <div className="grid wide">
      <Card title={t('about.title')}>
        <div className="prose">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <p>{t('about.p3')}</p>
          <p>
            <b>{t('about.disclaimer')}</b>
          </p>
          <p className="muted">{t('about.privacy')}</p>
          <p className="muted">{t('about.sources')}</p>
        </div>
      </Card>
      <Card title={t('about.formulas')}>
        <ul className="formulas">
          {FORMULAS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
