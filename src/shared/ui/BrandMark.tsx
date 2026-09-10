interface BrandMarkProps {
  size?: number
  className?: string
  /** Rótulo acessível; use `null` quando a marca vier acompanhada do nome em texto. */
  title?: string | null
}

/**
 * Símbolo do ARGUS.LLP: um "A" geométrico inscrito num sistema orbital, com um núcleo no centro.
 *
 * A leitura pretendida é **visão + espaço + núcleo**: o anel é o campo observado, o A é a
 * estrutura, o ponto é o foco. Deliberadamente não usa caminhão, pallet ou empilhadeira — a
 * logística aparece nos objetos do produto (os desenhos técnicos da biblioteca), não na marca.
 *
 * Desenhado em `currentColor` + um traço de destaque, então herda a cor do contexto e funciona
 * igual em tema claro e escuro, em 16px ou 64px.
 */
export function BrandMark({ size = 24, className = '', title = 'ARGUS.LLP' }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title ?? undefined}
    >
      {/* Campo orbital: o espaço observado */}
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.2"
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeWidth="1.25"
        transform="rotate(-24 16 16)"
      />
      {/* A geométrico: a estrutura */}
      <path
        d="M8.6 23.2 16 7.4l7.4 15.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.9 18.6h8.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Núcleo: o foco da leitura */}
      <circle cx="16" cy="16" r="2.1" fill="var(--color-primary, #0796D7)" />
    </svg>
  )
}
