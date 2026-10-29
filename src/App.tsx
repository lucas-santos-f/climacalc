import { useEffect, useLayoutEffect, useState } from 'react'
import { Lightbulb, Moon, Sun } from 'lucide-react'
import { decodeShare, useCurrentScenario, useStore, type Tab } from './state/store'
import { useComputed, useT } from './hooks'
import { LANGS } from './i18n'
import { ScenarioBar } from './components/ScenarioBar'
import { LoadPanel } from './components/panels/LoadPanel'
import { AirPanel } from './components/panels/AirPanel'
import { EquipmentPanel } from './components/panels/EquipmentPanel'
import { ComparePanel } from './components/panels/ComparePanel'
import { AboutPanel } from './components/panels/AboutPanel'

type Theme = 'light' | 'dark'
const THEME_KEY = 'climacalc:theme'
const INTRO_KEY = 'climacalc:intro-seen'

function savedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const t = useT()
  const sc = useCurrentScenario()
  const computed = useComputed(sc)
  const { lang, setLang, units, setUnits, tab, setTab, toast, importScenario, showToast } = useStore()
  const [theme, setTheme] = useState<Theme>(savedTheme)
  const [intro, setIntro] = useState(() => !introSeen())

  const closeIntro = () => {
    setIntro(false)
    try {
      localStorage.setItem(INTRO_KEY, '1')
    } catch {
      // blocked storage only means the tip shows up again next visit
    }
  }

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // storage can be blocked (private mode); the theme just won't stick
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // a shared link carries the whole scenario in the hash (#s=...)
  useEffect(() => {
    const m = /^#s=([A-Za-z0-9+\-$_.!*'(),%]+)$/.exec(location.hash)
    if (!m) return
    const parsed = decodeShare(m[1])
    history.replaceState(null, '', location.pathname + location.search)
    if (parsed) {
      importScenario(parsed, '(link)')
      showToast(t('scenario.imported'))
    } else showToast(t('scenario.invalid_link'))
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'load', label: t('nav.load') },
    { id: 'air', label: t('nav.air') },
    { id: 'equipment', label: t('nav.equipment') },
    { id: 'compare', label: t('nav.compare') },
    { id: 'about', label: t('nav.about') },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="container">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
                <path d="M10 40c7-10 15-10 22 0s15 10 22 0" />
                <path d="M10 24c7-10 15-10 22 0s15 10 22 0" opacity="0.65" />
              </svg>
            </span>
            <div className="brand-text">
              <div className="brand-name">{t('app.title')}</div>
              <div className="brand-tagline">{t('app.subtitle')}</div>
            </div>
          </div>
          <div className="settings">
            <div className="seg" role="group" aria-label={t('app.lang')}>
              {LANGS.map((l) => (
                <button key={l.id} type="button" className={lang === l.id ? 'active' : ''} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label={t('app.units')}>
              {(['SI', 'IP'] as const).map((s) => (
                <button key={s} type="button" className={units === s ? 'active' : ''} aria-pressed={units === s} onClick={() => setUnits(s)}>
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="btn icon ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('app.theme')} title={t('app.theme')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label={t('app.sections')}>
        <div className="container tabs">
          {tabs.map((tb) => (
            <button key={tb.id} type="button" className={tab === tb.id ? 'active' : ''} aria-current={tab === tb.id ? 'page' : undefined} onClick={() => setTab(tb.id)}>
              {tb.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main container">
        <div className="print-only" style={{ marginBottom: 16 }}>
          <h1>
            {t('app.title')}: {sc.name}
          </h1>
          <div className="muted">
            {t(`environment.${sc.environment}`)} · {new Date(sc.updatedAt).toLocaleString(lang)}
          </div>
        </div>
        <ScenarioBar sc={sc} computed={computed} />
        {intro && tab === 'load' && (
          <div className="intro no-print">
            <Lightbulb size={18} aria-hidden="true" />
            <p>{t('intro.text')}</p>
            <button type="button" className="btn small" onClick={closeIntro}>
              {t('intro.dismiss')}
            </button>
          </div>
        )}
        {tab === 'load' && <LoadPanel sc={sc} computed={computed} />}
        {tab === 'air' && <AirPanel sc={sc} computed={computed} />}
        {tab === 'equipment' && <EquipmentPanel sc={sc} computed={computed} />}
        {tab === 'compare' && <ComparePanel sc={sc} computed={computed} />}
        {tab === 'about' && <AboutPanel />}
      </main>

      <footer className="footer">
        <div className="container">
          <span>{t('app.footer')}</span>
          <span>v{__APP_VERSION__}</span>
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
