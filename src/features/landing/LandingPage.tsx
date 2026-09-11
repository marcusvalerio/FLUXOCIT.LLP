import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Layers, Share2, Sparkles, Workflow } from 'lucide-react'
import { isAccountModeEnabled } from '../../shared/data/authMode'
import { BrandMark } from '../../shared/ui/BrandMark'
import { useReveal } from './useReveal'
import { NumberCounter } from './NumberCounter'
import editorLayoutImg from '../../assets/landing/editor-layout.png'
import editorFlowImg from '../../assets/landing/editor-flow.png'
import editorMetricsImg from '../../assets/landing/editor-metrics.png'

/**
 * Landing Page institucional do ARGUS.LLP — uma experiência narrativa por rolagem, não uma
 * página de documentação. Ver briefing "ARGUS.LLP — Sharing + Landing Page Experience" (Partes
 * 7–17): seis capítulos, cada um revelado progressivamente, contando
 * espaço → operação → inteligência → pessoas → futuro.
 *
 * As seções escuras (Hero, Intelligence, Futuro, Final) usam a paleta fixa da marca em valores
 * literais (`bg-[#08080C]` etc.), não os tokens `--color-bg`/`--color-text-*` do app — esses
 * tokens trocam com o tema claro/escuro que o usuário escolhe *dentro* do produto, mas a
 * Landing é uma peça de marca com atmosfera própria por capítulo, que não deve se inverter
 * conforme o tema do sistema operacional (nenhuma product page de referência faz isso).
 */
export function LandingPage() {
  const navigate = useNavigate()
  const accountMode = isAccountModeEnabled()

  function goToApp() {
    navigate(accountMode ? '/signup' : '/projects')
  }

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="bg-[#08080C]">
      <Navbar accountMode={accountMode} onStart={goToApp} />
      <Hero accountMode={accountMode} onStart={goToApp} onExplore={() => scrollToId('espaco')} />
      <ChapterEspaco />
      <ChapterFlow />
      <ChapterIntelligence />
      <ChapterSharing />
      <ChapterFuturo />
      <FinalChapter onStart={goToApp} />
      <Footer />
    </div>
  )
}

// ==================================================
// Navbar
// ==================================================

function Navbar({ accountMode, onStart }: { accountMode: boolean; onStart: () => void }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled ? 'bg-[#08080C]/85 backdrop-blur border-b border-white/10' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 text-[#EDEAE5]"
        >
          <BrandMark size={22} title={null} />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            ARGUS<span className="text-[#0796D7]">.LLP</span>
          </span>
        </button>

        <nav className="hidden items-center gap-7 text-sm text-[#B8DCEF]/80 md:flex">
          <a href="#espaco" className="hover:text-[#EDEAE5] transition-colors">
            Produto
          </a>
          <a href="#inteligencia" className="hover:text-[#EDEAE5] transition-colors">
            Soluções
          </a>
          <a href="#futuro" className="hover:text-[#EDEAE5] transition-colors">
            Sobre
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {accountMode && (
            <button
              onClick={() => navigate('/login')}
              className="hidden text-sm text-[#EDEAE5]/80 hover:text-[#EDEAE5] transition-colors sm:inline"
            >
              Entrar
            </button>
          )}
          <button
            onClick={onStart}
            className="rounded-lg bg-[#0796D7] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#024C7B]"
          >
            Começar agora
          </button>
        </div>
      </div>
    </header>
  )
}

// ==================================================
// Capítulo 01 — Hero
// ==================================================

function Hero({ accountMode: _accountMode, onStart, onExplore }: { accountMode: boolean; onStart: () => void; onExplore: () => void }) {
  return (
    <section className="relative flex min-h-[92dvh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-10 text-center">
      {/* Reflexo/iluminação discreto atrás do produto — puro CSS, sem imagem extra. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 38%, rgba(7,150,215,0.16), transparent 70%), radial-gradient(40% 30% at 50% 90%, rgba(184,220,239,0.08), transparent 70%)',
        }}
      />

      <p className="relative mb-5 animate-fade-in font-heading text-xs font-semibold uppercase tracking-[0.2em] text-[#B8DCEF]/70">
        Logistics Planning &amp; Intelligence
      </p>
      <h1 className="relative max-w-4xl animate-panel-in font-display text-4xl font-semibold leading-[1.1] text-[#EDEAE5] sm:text-5xl md:text-6xl lg:text-7xl">
        Planejar o espaço.
        <br />
        Entender a operação.
      </h1>
      <p
        className="relative mt-6 max-w-lg animate-panel-in text-balance text-base text-[#B8DCEF]/80 sm:text-lg"
        style={{ animationDelay: '80ms' }}
      >
        Uma nova forma de visualizar, organizar e compreender operações logísticas.
      </p>

      <div className="relative mt-9 flex animate-panel-in flex-wrap items-center justify-center gap-3" style={{ animationDelay: '140ms' }}>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0796D7] px-6 py-3 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] hover:bg-[#024C7B] active:scale-[0.98]"
        >
          Começar agora
          <ArrowRight size={16} />
        </button>
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-[#EDEAE5] transition-colors hover:bg-white/5"
        >
          Explorar o ARGUS
        </button>
      </div>

      <div
        className="relative mt-16 w-full max-w-5xl animate-drop-in overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_120px_-40px_rgba(7,150,215,0.35)]"
        style={{ animationDelay: '260ms' }}
      >
        <img
          src={editorLayoutImg}
          alt="Editor de layout do ARGUS.LLP mostrando um armazém em construção, com porta-paletes, corredor e áreas de armazenagem."
          className="w-full"
          width={1440}
          height={900}
        />
      </div>
    </section>
  )
}

// ==================================================
// Section scaffolding shared by chapters 02–05
// ==================================================

function ChapterLabel({ number, children }: { number: string; children: ReactNode }) {
  return (
    <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-[#0796D7]">
      Capítulo {number} — {children}
    </p>
  )
}

// ==================================================
// Capítulo 02 — O Espaço
// ==================================================

function ChapterEspaco() {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const chips = [
    { label: 'Porta-paletes', delay: 0 },
    { label: 'Corredor', delay: 120 },
    { label: 'Área de armazenagem', delay: 240 },
  ]

  return (
    <section id="espaco" className="bg-[#EDEAE5] px-5 py-28 text-[#08080C] sm:py-36">
      <div ref={ref} className="mx-auto max-w-5xl text-center">
        <ChapterLabel number="02">O Espaço</ChapterLabel>
        <h2 className={`reveal mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl ${visible ? 'is-visible' : ''}`}>
          Comece pelo espaço.
        </h2>
        <p
          className={`reveal mx-auto mt-5 max-w-md text-base text-[#4B4F58] sm:text-lg ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '80ms' }}
        >
          Antes de otimizar uma operação, você precisa enxergá-la.
        </p>

        <div className="relative mt-14">
          <div
            className={`reveal-scale mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#D9D5CB] shadow-xl ${visible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '120ms' }}
          >
            <img
              src={editorLayoutImg}
              alt="Layout 2D do ARGUS.LLP com racks, corredor, empilhadeira e duas áreas de armazenagem."
              className="w-full"
              width={1440}
              height={900}
            />
          </div>

          {/* Objetos "surgindo" ao lado do layout — a sensação de "eu consigo construir isto aqui". */}
          <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2.5">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className={`reveal rounded-full border border-[#D9D5CB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#4B4F58] ${visible ? 'is-visible' : ''}`}
                style={{ transitionDelay: `${240 + chip.delay}ms` }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================================================
// Capítulo 03 — Flow
// ==================================================

function ChapterFlow() {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const steps = ['Recebimento', 'Conferência', 'Armazenagem', 'Picking', 'Expedição']

  return (
    <section id="flow" className="bg-[#03355E] px-5 py-28 text-[#EDEAE5] sm:py-36">
      <div ref={ref} className="mx-auto max-w-5xl text-center">
        <ChapterLabel number="03">Flow</ChapterLabel>
        <h2 className={`reveal mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl ${visible ? 'is-visible' : ''}`}>
          O espaço mostra onde.
          <br />O Flow mostra como.
        </h2>

        <div
          className={`reveal-scale mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-xl ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '100ms' }}
        >
          <img
            src={editorFlowImg}
            alt="Prancheta de Fluxo do ARGUS.LLP com etapas de processo conectando o desenho físico à operação."
            className="w-full"
            width={1440}
            height={900}
          />
        </div>

        {/* Cadeia completa de etapas, com uma linha que se desenha ao entrar em vista. */}
        <div className="mx-auto mt-10 max-w-3xl">
          <svg viewBox="0 0 100 4" className="mx-auto mb-3 h-2 w-full max-w-2xl" preserveAspectRatio="none" aria-hidden="true">
            <line
              x1="2"
              y1="2"
              x2="98"
              y2="2"
              stroke="#0796D7"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={`draw-line ${visible ? 'is-visible' : ''}`}
            />
          </svg>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs font-medium text-[#B8DCEF] sm:text-sm">
            {steps.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span
                  className={`reveal rounded-full bg-white/5 px-3 py-1.5 ${visible ? 'is-visible' : ''}`}
                  style={{ transitionDelay: `${300 + i * 120}ms` }}
                >
                  {step}
                </span>
                {i < steps.length - 1 && <ArrowRight size={14} className="text-[#0796D7]/60" />}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================================================
// Capítulo 04 — Intelligence
// ==================================================

function ChapterIntelligence() {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const stats = [
    { label: 'Capacidade', value: 1240, suffix: ' un/dia' },
    { label: 'Utilização', value: 78, suffix: '%' },
    { label: 'Gargalos', value: 2, suffix: '' },
    { label: 'Distância', value: 842, suffix: ' m' },
  ]

  return (
    <section id="inteligencia" className="bg-[#08080C] px-5 py-28 text-[#EDEAE5] sm:py-36">
      <div ref={ref} className="mx-auto max-w-5xl text-center">
        <ChapterLabel number="04">Intelligence</ChapterLabel>
        <h2 className={`reveal mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl ${visible ? 'is-visible' : ''}`}>
          Quando o desenho começa a responder.
        </h2>
        <p
          className={`reveal mx-auto mt-5 max-w-md text-base text-[#B8DCEF]/80 sm:text-lg ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '80ms' }}
        >
          O ARGUS transforma layout e operação em informação.
        </p>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`reveal rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 ${visible ? 'is-visible' : ''}`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              <p className="font-display text-2xl font-semibold text-[#EDEAE5] sm:text-3xl">
                <NumberCounter value={stat.value} suffix={stat.suffix} start={visible} durationMs={1200 + i * 150} />
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-[#B8DCEF]/60">{stat.label}</p>
            </div>
          ))}
        </div>

        <div
          className={`reveal mx-auto mt-8 max-w-xl rounded-xl border border-[#D97706]/30 bg-[#D97706]/10 px-5 py-4 text-left ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '650ms' }}
        >
          <p className="text-sm text-[#EDEAE5]">
            <span className="font-medium text-[#F5A623]">Recomendação </span>
            — Área de staging próxima da capacidade.
          </p>
        </div>

        {/* Recorte real do painel de Métricas — só a metade superior (indicadores), sem a lista
            de alertas abaixo, que rende melhor como recomendação isolada acima. */}
        <div
          className={`reveal-scale mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-white/10 shadow-xl ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '750ms' }}
        >
          <div className="h-[220px] overflow-hidden sm:h-[300px]">
            <img
              src={editorMetricsImg}
              alt="Painel de Métricas do ARGUS.LLP com área total, ocupação, contagens e etapas de operação."
              className="w-full"
              width={1440}
              height={900}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================================================
// Capítulo 05 — Compartilhamento
// ==================================================

function ChapterSharing() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section id="compartilhamento" className="bg-[#E3E6EB] px-5 py-28 text-[#08080C] sm:py-36">
      <div ref={ref} className="mx-auto max-w-5xl text-center">
        <ChapterLabel number="05">Pessoas</ChapterLabel>
        <h2 className={`reveal mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl ${visible ? 'is-visible' : ''}`}>
          Planejamento não precisa acontecer sozinho.
        </h2>
        <p
          className={`reveal mx-auto mt-5 max-w-md text-base text-[#4B4F58] sm:text-lg ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '80ms' }}
        >
          Compartilhe o projeto. Continue o trabalho. Mantenha todos na mesma direção.
        </p>

        <div
          className={`reveal-scale mx-auto mt-14 max-w-md rounded-2xl border border-[#D9D5CB] bg-[#F6F4F0] p-5 text-left shadow-lg ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '120ms' }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[#4B4F58]/70">Projeto</p>
          <p className="font-heading text-base font-semibold text-[#08080C]">CD Guaratiba</p>

          <div className="mt-5 space-y-1">
            {[
              { initials: 'M', name: 'Marcus', role: 'Proprietário', delay: 280 },
              { initials: 'J', name: 'João', role: 'Editor', delay: 400 },
            ].map((person) => (
              <div
                key={person.name}
                className={`reveal flex items-center gap-3 rounded-lg px-2 py-2.5 ${visible ? 'is-visible' : ''}`}
                style={{ transitionDelay: `${person.delay}ms` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0796D7]/15 text-sm font-semibold text-[#024C7B]">
                  {person.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[#08080C]">{person.name}</span>
                  <span className="block text-xs text-[#4B4F58]">{person.role}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p
          className={`reveal mx-auto mt-8 max-w-sm text-sm text-[#4B4F58] ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '540ms' }}
        >
          Mesmo projeto. Mais pessoas. Uma mesma direção.
        </p>
      </div>
    </section>
  )
}

// ==================================================
// Capítulo 06 — Futuro
// ==================================================

function ChapterFuturo() {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const stages = [
    { label: 'Layout', icon: Layers, active: true },
    { label: 'Flow', icon: Workflow, active: true },
    { label: 'Simulation', icon: Sparkles, active: false },
  ]

  return (
    <section id="futuro" className="bg-[#024C7B] px-5 py-28 text-[#EDEAE5] sm:py-36">
      <div ref={ref} className="mx-auto max-w-3xl text-center">
        <ChapterLabel number="06">Futuro</ChapterLabel>
        <h2 className={`reveal mx-auto mt-4 max-w-xl font-display text-4xl font-semibold leading-tight sm:text-5xl ${visible ? 'is-visible' : ''}`}>
          O próximo passo é entender o que acontece.
        </h2>

        <div className="mx-auto mt-14 flex max-w-md flex-col items-center gap-3">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex w-full flex-col items-center">
              <div
                className={`reveal flex w-full items-center justify-center gap-2.5 rounded-xl border px-5 py-4 ${
                  stage.active ? 'border-white/20 bg-white/[0.06]' : 'border-dashed border-white/25 bg-transparent'
                } ${visible ? 'is-visible' : ''}`}
                style={{ transitionDelay: `${150 + i * 180}ms` }}
              >
                <stage.icon size={18} className={stage.active ? 'text-[#B8DCEF]' : 'text-[#B8DCEF]/50'} />
                <span className={`font-heading text-sm font-medium ${stage.active ? 'text-[#EDEAE5]' : 'text-[#EDEAE5]/60'}`}>
                  {stage.label}
                </span>
                {!stage.active && (
                  <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#B8DCEF]/80">
                    Visão futura
                  </span>
                )}
              </div>
              {i < stages.length - 1 && <span aria-hidden="true" className="my-1 h-6 w-px bg-white/20" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==================================================
// Capítulo Final
// ==================================================

function FinalChapter({ onStart }: { onStart: () => void }) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section className="bg-[#08080C] px-5 py-32 text-center text-[#EDEAE5] sm:py-44">
      <div ref={ref} className="mx-auto max-w-2xl">
        <h2 className={`reveal font-display text-4xl font-semibold leading-tight sm:text-5xl ${visible ? 'is-visible' : ''}`}>
          Um planejamento melhor
          <br />
          para uma operação melhor.
        </h2>
        <p
          className={`reveal mt-8 font-heading text-base uppercase tracking-[0.25em] text-[#B8DCEF]/70 ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '150ms' }}
        >
          Planejar. Entender. Transformar.
        </p>
        <p
          className={`reveal mt-6 font-display text-lg font-semibold ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '250ms' }}
        >
          ARGUS<span className="text-[#0796D7]">.LLP</span>
        </p>
        <button
          onClick={onStart}
          className={`reveal mt-10 inline-flex items-center gap-2 rounded-lg bg-[#0796D7] px-7 py-3.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] hover:bg-[#024C7B] active:scale-[0.98] ${visible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '350ms' }}
        >
          Começar agora
        </button>
      </div>
    </section>
  )
}

// ==================================================
// Footer
// ==================================================

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#08080C] px-5 py-8 text-center text-xs text-[#B8DCEF]/50">
      <p>ARGUS.LLP — Logistics Planning &amp; Intelligence</p>
      <p className="mt-1">Compartilhamento em equipe · <Share2 size={11} className="inline -mt-0.5" /> feito para operações reais.</p>
    </footer>
  )
}
