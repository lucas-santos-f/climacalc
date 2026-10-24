import { Card } from '../ui/Field'
import { useT } from '../../hooks'

export function AboutPanel() {
  const t = useT()
  return (
    <div className="grid">
      <Card title={t('about.title')} className="span-2">
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
      <Card title="Fórmulas principais / Key formulas" className="span-2">
        <div className="prose mono" style={{ fontSize: '0.82rem' }}>
          <p>Q_parede = U·A·CLTD_corr ; CLTD_corr = CLTD·f_massa·f_cor + (25,5 − T_int) + (T_ext − ΔT_diário/2 − 29,4)</p>
          <p>Q_vidro = U·A·(T_ext − T_int) + A·SHGF·SHGC·f_sombra·CLF</p>
          <p>Q_pessoas = n·(q_sens + q_lat)·f_simult ; Q_luz = W/m²·A·f_reator·f_simult ; Q_equip = (W/m²·A + kW)·f_simult</p>
          <p>Q_ar = ṁ·cp·ΔT (sensível) + ṁ·Δw·2501 kJ/kg (latente) ; ṁ = V̇/v_ext</p>
          <p>V̇_insuf = Q_sens,amb / (ρ·cp·ΔT_insuf) ; w_insuf = w_amb − Q_lat / (ṁ·2501)</p>
          <p>Mistura: T_m = T_amb + f_oa·(T_ext − T_amb) ; ADP = interseção da reta mistura→insuflamento com a saturação ; BF = (T_insuf − T_ADP)/(T_m − T_ADP)</p>
          <p>P_el,compressor = Q_cap / COP ; P_vent = SFP·V̇ ; kVA = kW/FP ; I = kVA·1000/(√3·V)</p>
          <p>Carga máxima A2L/A3 em ambiente: m_max = 2,5·LFL^(5/4)·h₀·√A (IEC 60335-2-40) ; ventilação de emergência 70·√G L/s (ASHRAE 15)</p>
          <p>Ciclo: ṁ = Q/(h₁ − h₄) ; h₂ = h₁ + (h₂ₛ − h₁)/η_is ; COP = Q/W ; V̇_desl = ṁ·v₁/η_vol</p>
        </div>
      </Card>
    </div>
  )
}
