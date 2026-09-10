# ARGUS.LLP — Design System

Referência de implementação: Tailwind CSS (tokens abaixo mapeiam para
`tailwind.config` — cores customizadas, escala de espaçamento padrão do
Tailwind, fontes). Ver `docs/UX.md` para diretrizes de interação.

## 1. Identidade visual

ARGUS.LLP é uma ferramenta técnica e profissional — a interface deve
transmitir precisão e clareza, não decoração. Referência de tom:
software de engenharia/planejamento, não um app de consumo lúdico.

Princípios:
- **Neutro por padrão, cor com propósito** — a UI de chrome (painéis,
  botões, texto) é neutra (cinza/slate); cor é reservada para
  categorias de objetos no canvas, estados (sucesso/erro/aviso) e ações
  primárias.
- **Canvas é o protagonista** — a UI ao redor do canvas deve ocupar o
  mínimo de espaço necessário, especialmente no mobile.
- **Alvos de toque generosos** — nunca menor que 40×40px para controles
  interativos.

## 2. Cores

### 2.1 Paleta de interface (chrome)

Paleta de marca (Fase 1): neutros de base — **Authentic Black**
`#08080C`, **White Sand** `#EDE9E3`, **Cute Silver** `#E3E6EB` — e cores
de identidade/interação — **Regal Blue** `#03355E`, **Smooth Blue**
`#0796D7`, **Endless Sky** `#024C7B`, **Royal Light Blue** `#B8DCEF`.
Princípio: **neutro por padrão, cor por significado** — o branco puro
(`#FFFFFF`) nunca é a superfície principal, e o azul de identidade é
reservado para ações/seleção/foco, nunca dominando a interface inteira.

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--color-bg` | `#EDE9E3` (White Sand) | `#08080C` (Authentic Black) | Fundo geral da aplicação. |
| `--color-surface` | `#F6F4F0` | `#131319` | Painéis, cards, barra superior. |
| `--color-surface-alt` | `#E3E6EB` (Cute Silver) | `#1B1D24` | Fundo do canvas fora dos limites do ambiente, superfícies elevadas. |
| `--color-border` | `#D9D5CB` | `#2B2E37` | Bordas de painéis, divisores. |
| `--color-text-primary` | `#08080C` (Authentic Black) | `#EDE9E3` (White Sand) | Texto principal. |
| `--color-text-secondary` | `#4B4F58` | `#A7ABB5` | Texto secundário/legendas. |
| `--color-text-disabled` | `#9A9CA3` | `#6B6E76` | Texto/ícones desabilitados. |
| `--color-primary` | `#0796D7` (Smooth Blue) | `#0796D7` (Smooth Blue) | Ação primária, seleção, foco. |
| `--color-primary-hover` | `#024C7B` (Endless Sky) | `#48BDEC` | Hover/active do primário — escurece no claro, clareia no escuro (mantém contraste contra o fundo). |
| `--color-primary-subtle` | `#B8DCEF` (Royal Light Blue) | `#12293A` | Fundos sutis/badges relacionados à ação primária. |
| `--color-accent-deep` | `#03355E` (Regal Blue) | `#B8DCEF` (Royal Light Blue) | Acento reservado a ênfases pontuais (não usado em áreas grandes de UI). |
| `--color-success` | `#16A34A` | `#22C55E` | Confirmações, "salvo". |
| `--color-warning` | `#D97706` | `#F59E0B` | Avisos (objeto fora do ambiente, zona de segurança). |
| `--color-danger` | `#DC2626` | `#F87171` | Exclusão, erros, sobreposição de armazenagem. |

Os dois temas são implementados via as mesmas variáveis CSS
redefinidas em `:root[data-theme="dark"]` (seleção explícita,
persistida em `localStorage`) e em `prefers-color-scheme: dark`
(fallback do sistema) — nenhum componente lê um valor de cor fixo,
todos consomem os tokens. Ver `src/app/index.css` e
`src/shared/state/useThemeStore.ts`.

### 2.2 Cores por categoria de objeto (canvas)

Cada categoria tem uma cor de identificação, usada como contorno/preenchimento leve dos objetos no canvas — permite reconhecimento rápido sem depender só do ícone:

| Categoria | Cor | Token |
|-----------|-----|-------|
| Estrutura (paredes, portas, docas) | Cinza-chumbo `#3F4753` | `--cat-structure` |
| Armazenagem (racks, porta-paletes, corredores) | Âmbar `#B45309` | `--cat-storage` |
| Paletes | Marrom-madeira `#8B5E34` | `--cat-pallet` |
| Equipamentos (empilhadeira, paleteira) | Azul `#2563EB` | `--cat-equipment` |
| Áreas (recebimento, expedição, picking...) | Verde-água `#0D9488` (variação de matiz por subtipo de área, ver 2.3) | `--cat-area` |
| Fluxos (rotas, setas) | Roxo `#7C3AED` | `--cat-flow` |
| Outros/personalizado | Cinza-azulado `#64748B` | `--cat-other` |

### 2.3 Cores de subtipos de área

Áreas usam preenchimento translúcido (~12% de opacidade) da mesma
família de cor, com borda tracejada na cor cheia, para não competir
visualmente com objetos sólidos por cima delas:

| Área | Cor base |
|------|----------|
| Recebimento | `#0D9488` (teal) |
| Expedição | `#2563EB` (azul) |
| Picking | `#7C3AED` (roxo) |
| Staging | `#D97706` (âmbar) |
| Quarentena | `#DC2626` (vermelho) |
| Devolução | `#DB2777` (rosa) |
| Armazenagem | `#B45309` (âmbar escuro) |
| Circulação | `#64748B` (cinza-azulado) |
| Administrativa | `#0EA5E9` (azul claro) |
| Personalizada | cor escolhida pelo usuário dentre uma paleta fixa |

## 3. Tipografia

Três famílias, cada uma com um papel fixo — não substituíveis
arbitrariamente:

| Token | Fonte | Uso |
|-------|-------|-----|
| `--font-display` (`font-display`) | **Familjen Grotesk** (via `fonts.googleapis.com`) | Títulos principais (nome do layout no cabeçalho, título da lista de layouts). |
| `--font-heading` (`font-heading`) | **Supreme** (via `api.fontshare.com`) | Títulos secundários e rótulos de seção (título de painel, título de bottom sheet, cabeçalho de propriedades do objeto). |
| `--font-sans` (padrão do `body`) | **Sora** (via `fonts.googleapis.com`) | Texto de UI e corpo — labels, botões, inputs, listas. |

Todas com fallback `system-ui, sans-serif`. `Sora` é a fonte padrão do
`<body>`, então qualquer texto sem classe explícita já usa a fonte
correta — `font-display`/`font-heading` são aplicadas pontualmente aos
títulos listados acima.

- Escala (mobile-first, cresce em telas maiores via classes
  responsivas do Tailwind):

| Token | Tamanho | Uso |
|-------|---------|-----|
| `text-xs` | 12px | Legendas, rótulos de campo. |
| `text-sm` | 14px | Texto padrão de UI (painéis, listas). |
| `text-base` | 16px | Corpo, inputs (16px evita zoom automático em iOS). |
| `text-lg` | 18px | Títulos de painel/seção. |
| `text-xl` | 22px | Títulos de página. |
| `text-2xl` | 28px | Título principal (ex.: tela de login). |

Peso: `font-medium` (500) para rótulos e botões, `font-semibold` (600)
para títulos, `font-normal` (400) para corpo.

## 4. Espaçamento e grid de layout de UI

Escala padrão do Tailwind (múltiplos de 4px): `1` (4px), `2` (8px), `3`
(12px), `4` (16px), `6` (24px), `8` (32px). Painéis usam `padding: 16px`
(mobile) / `24px` (desktop ≥1024px).

## 5. Componentes base

- **Botão primário** — fundo `--color-primary`, texto branco, altura
  mínima 44px (mobile) / 36px (desktop), cantos `rounded-md` (6px).
- **Botão secundário** — fundo `--color-surface`, borda
  `--color-border`, mesmo padding do primário.
- **Botão de ícone** (ações rápidas do editor: duplicar, excluir,
  girar) — quadrado 44×44px (mobile) / 36×36px (desktop), ícone
  centralizado, estado ativo com fundo `--color-primary`/10%.
- **Input numérico** (painel de propriedades) — largura fixa curta,
  sufixo de unidade (`m`, `°`) exibido dentro do campo, alinhado à
  direita; incrementos por toque longo/setas quando no desktop.
- **Painel (Panel)** — `--color-surface`, borda `--color-border`,
  sombra leve (`shadow-sm`), cantos `rounded-lg` (8px).
- **Bottom sheet (mobile)** — painel deslizante a partir da base da
  tela, alça de arraste no topo, usado para biblioteca de objetos e
  propriedades em telas pequenas.
- **Badge de status de salvamento** — texto pequeno + ícone
  (`Salvando…`, `Salvo`, `Erro ao salvar` em `--color-danger`).
- **Item de biblioteca de objetos** — miniatura da representação 2D do
  objeto + rótulo, em grade responsiva (2 colunas mobile, 3–4 desktop).

## 6. Iconografia

- Biblioteca: `lucide-react` (ícones de linha, consistentes,
  leves) para UI de chrome (menus, ações, navegação).
- Representações de objetos do canvas **não** usam ícones genéricos de
  biblioteca — são desenhos vetoriais próprios (formas Konva),
  desenhados para parecerem reconhecíveis na escala do canvas (ver
  `docs/UX.md` § representação de objetos).

## 7. Estados e feedback

- **Seleção no canvas:** contorno azul (`--color-primary`) de 1,5px +
  alças de transformação (14px, brancas com anel azul) nos cantos/lados
  + alça de rotação acima do objeto + **etiqueta de dimensões**
  (`largura × comprimento`) ancorada abaixo da seleção, que acompanha
  arraste e redimensionamento.
- **Hover (desktop):** leve realce (sombra ou contorno a 40% de
  opacidade) antes de clicar.
- **Snap ativo:** linha-guia tracejada `--color-primary` cruzando o
  canvas no eixo alinhado, some ao soltar.
- **Carregando:** skeleton simples (blocos cinza pulsantes) em listas;
  spinner discreto em ações pontuais.
- **Erro:** texto em `--color-danger` + ícone, nunca apenas cor (também
  para acessibilidade/daltonismo).
- **Salvamento:** indicador permanente no cabeçalho (ponto/spinner/✓ +
  texto) e confirmação curta no botão **Salvar** (o ícone vira ✓ por
  ~1,6s). Nunca um toast que cobre a prancheta.
- **Arrastar da biblioteca:** o item levanta (escala 1.02 + opacidade) e
  a prancheta ganha uma moldura azul discreta enquanto é alvo de drop.

## 7.1 Motion

Princípio: **motion explica estado, não chama atenção.** Nada de bounce,
nada acima de 400ms, e tudo em `transform`/`opacity` para não custar
re-render do canvas.

| Token | Valor | Uso |
|-------|-------|-----|
| `--duration-fast` | 130ms | hover, press, troca de ícone |
| `--duration-base` | 180ms | seleção, entrada de elemento, fade de painel |
| `--duration-panel` | 280ms | gaveta lateral, bottom sheet, troca de prancheta |
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | transições gerais |
| `--ease-out-soft` | `cubic-bezier(.22,1,.36,1)` | entradas (drop-in, slide-in) |

Classes utilitárias: `.animate-fade-in`, `.animate-panel-in`,
`.animate-sheet-in`, `.animate-drop-in`, `.animate-slide-in-left`,
`.animate-slide-in-right`, `.animate-pop-in`. Todas são desligadas em
`prefers-reduced-motion: reduce`, junto com um teto global de 1ms nas
transições.

## 8. Acessibilidade

- Contraste mínimo AA (4.5:1) para texto normal, 3:1 para texto
  grande/ícones essenciais.
- Nenhuma informação de estado transmitida **só** por cor (categoria de
  objeto também tem forma distinta; erro também tem ícone/texto).
- Todos os controles interativos alcançáveis por teclado no desktop
  (foco visível usando `--color-primary`).
