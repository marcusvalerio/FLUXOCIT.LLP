# FluxoCit — Diretrizes de UX

Complementa `docs/DESIGN_SYSTEM.md` (tokens visuais) e
`docs/USER_FLOWS.md` (fluxos). Este documento foca em **como o editor
2D se comporta**, com prioridade mobile-first.

## 1. Princípio geral

O editor deve dar sensação de **montagem direta e sem fricção** — o
usuário toca/arrasta um objeto e ele responde imediatamente, sem
diálogos intermediários para ações comuns (inserir, mover, duplicar,
excluir). Diálogos de confirmação são reservados para ações destrutivas
irreversíveis fora do canvas (excluir layout inteiro).

## 2. Layout de telas

### 2.1 Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ FluxoCit.LLP │ ← │ Projeto        [ Layout | Fluxo ]   ↶ ↷ Salvar ⋮│
│                    status de salvamento                            │
├────────────┬──────────────────────────────────┬──────────────────┤
│ Biblioteca │  [+ − ⤢ ⌖]                        │ Propriedades │    │
│ busca      │                                    │ Ambiente     │    │
│ categorias │            PRANCHETA               │ Métricas     │    │
│ linhas     │                                    │ (abas)       │    │
│ (ícone     │  78% ▭1m  [⬉ ✋ ▦ 🧲 ⤳ ⤓]  [minimapa]│              │    │
│  técnico)  │                                    │              │    │
└────────────┴──────────────────────────────────┴──────────────────┘
```

- **Cabeçalho** em três blocos: identidade + projeto + status à
  esquerda, prancheta ativa (Layout/Fluxo) ao centro, ações à direita
  (desfazer/refazer, tema, **Salvar**, menu de ações secundárias).
- **Biblioteca** (264px, ≥1024px): busca no topo, categorias em chips e
  itens em **linhas densas** — ícone técnico (o mesmo símbolo que vai
  para a prancheta), nome e função. Nunca cards grandes.
- **Painel direito** (288–312px, ≥768px): abas Propriedades / Ambiente /
  Métricas. Sem seleção, Propriedades mostra um estado vazio explicativo
  em vez de uma coluna em branco.
- **Controles flutuantes** sobre a prancheta: zoom no canto superior
  esquerdo, ferramentas (selecionar, mover prancheta, grade, snap, fluxo
  sobre o layout, exportar) na barra inferior central, leitura de zoom +
  escala no canto inferior esquerdo e **minimapa** no inferior direito.
- Entre 768px e 1023px a biblioteca vira gaveta lateral (botão
  "Biblioteca" sobre a prancheta); o painel direito permanece fixo.

### 2.2 Mobile (<1024px)

```
┌─────────────────────────────┐
│ Barra superior (compacta):   │
│ ← voltar · nome · status      │
├───────────────────────────────┤
│                               │
│         CANVAS 2D             │
│    (ocupa toda a área)        │
│                               │
├───────────────────────────────┤
│ Barra de ações (fixa, base):  │
│ [+ Objeto] [↶] [↷] [⟳] [🗑]   │
└───────────────────────────────┘
```

- **Biblioteca de objetos** abre como *bottom sheet* ao tocar `[+
  Objeto]`, ocupando ~60% da altura da tela, com categorias em abas
  horizontais roláveis.
- **Propriedades** abrem como *bottom sheet* menor ao selecionar um
  objeto (some ao desselecionar/tocar fora), com botão explícito de
  fechar (X) além de tocar fora. **Comportamento anti-interceptação de
  toque (Fase 1):** a cada nova seleção o sheet nasce **recolhido**
  (apenas a barra de título, sem cobrir o canvas onde o objeto acabou
  de ser inserido/selecionado) e é forçado a ficar recolhido durante
  qualquer arraste em andamento no canvas — nunca reabre sozinho ao
  final do gesto, só quando o usuário toca a barra de título
  explicitamente ("reabre sob demanda"). Fechar via X sempre apenas
  desseleciona, nunca exclui o objeto. Ver
  `src/shared/ui/BottomSheet.tsx` (`collapsed`/`onToggleCollapsed`) e
  `src/features/editor/EditorPage.tsx`.
- **Barra de ações** sempre visível na base quando o editor está aberto,
  com os controles mais usados; ações menos comuns (duplicar layout,
  configurações do layout) ficam em um menu (`⋮`) na barra superior.

## 3. Interação com o canvas

### 3.1 Seleção

- **Toque/clique simples** em um objeto → seleciona (desseleciona
  qualquer seleção anterior).
- **Toque/clique em área vazia** → desseleciona tudo.
- **Seleção múltipla (P1):** desktop via `Shift+clique` ou retângulo de
  arraste a partir de área vazia; mobile via long-press para entrar em
  "modo seleção múltipla", depois toques adicionais somam à seleção.

### 3.2 Mover

- Arrastar um objeto selecionado (ou não — primeiro toque seleciona e
  já inicia o drag no mesmo gesto) o move; snapping ativo por padrão.
- Durante o arraste, exibir a posição atual (X, Y em metros) em um
  pequeno rótulo flutuante próximo ao objeto.
- Soltar o objeto commita a posição (gera entrada de undo).

### 3.3 Rotação

- **Alça de rotação** acima do objeto selecionado (arrastar em círculo)
  para ajuste livre, com snap a cada 15° por padrão (desativável
  mantendo pressionado um modificador no desktop; no mobile, snap
  sempre ativo por simplicidade, ajuste fino via campo numérico).
- **Botões rápidos** "girar -90°" / "girar +90°" na barra de ações —
  forma primária de rotação no mobile, mais previsível que gesto livre.
- Campo numérico de rotação no painel de propriedades para valor exato.

### 3.4 Redimensionar (quando aplicável)

- Handles nos cantos/bordas do bounding box (Transformer do Konva),
  visíveis apenas para tipos com `resizable: true` (ex.: parede, área).
- Alternativa sempre disponível: campos numéricos de largura/comprimento
  no painel de propriedades (mais confiável em touch).

### 3.5 Duplicar

- Botão de ação rápida (barra de ações, visível com seleção) e atalho
  `Ctrl/Cmd+D` no desktop.
- Cópia aparece deslocada (+20cm em X e Y) da original, já selecionada,
  permitindo reposicionar imediatamente.

### 3.6 Excluir

- Botão de ação rápida e tecla `Delete/Backspace` no desktop.
- Sem diálogo de confirmação (ação é desfazível via undo) — mas exibir
  um *toast* breve "Objeto excluído — Desfazer" com ação rápida de
  undo, para reduzir ansiedade do usuário.

### 3.7 Zoom e pan

Regra que organiza tudo: **deslocar a prancheta nunca move um objeto, e
mover um objeto nunca desloca a prancheta.** O que separa os dois é o
gesto, não a sorte de onde o cursor estava.

- **Desktop — pan:** quatro caminhos equivalentes, todos válidos mesmo
  com o cursor sobre um objeto: **botão direito + arrastar**, botão do
  meio + arrastar, **espaço + arrastar** e a ferramenta **"Mover
  prancheta"** (mãozinha na barra inferior). Enquanto qualquer um deles
  está ativo os objetos deixam de ser arrastáveis, então o gesto nunca
  faz as duas coisas ao mesmo tempo. O cursor indica o modo (seta ↔ mão).
- **Desktop — zoom:** roda do mouse (ancorado no cursor) e botões
  `+`/`−`/"ajustar à tela"/"centralizar na seleção".
- **Mobile:** pinça de dois dedos = zoom **e** pan no mesmo gesto (o
  ponto do mundo sob o centro dos dedos fica ancorado); um dedo em área
  vazia = pan; um dedo sobre um objeto = mover o objeto. Botões de zoom
  sempre visíveis (não depender só de gesto).
- **Minimapa** (≥768px): clicar/arrastar recentraliza a prancheta —
  navegação, nunca edição.
- Arrastar um item da biblioteca até a prancheta insere o objeto **no
  ponto solto** (drag & drop nativo, desktop); no toque, tocar no item
  insere no centro da viewport.
- Limites de zoom: min. suficiente para ver o layout inteiro + margem;
  max. suficiente para posicionar objetos pequenos (pallet) com
  precisão de poucos centímetros.

### 3.8 Grid e snapping

- Grid sempre visível por padrão (pode ser ocultado via toggle na barra
  superior, sem afetar o snapping).
- Toggle de snap-to-grid acessível (ícone de ímã na barra de ações);
  estado persistido por sessão do usuário (não por layout).

### 3.9 Estado vazio da prancheta

Projeto sem objetos mostra, no centro e discretamente, "Comece a montar
seu layout" + como inserir (arrastar da biblioteca ou tocar). Some com
um fade curto quando o primeiro objeto entra — nunca ocupa a prancheta
inteira nem intercepta cliques.

## 4. Representação de objetos (diretrizes de desenho)

Cada objeto deve ser reconhecível em uma rápida olhada, mesmo em zoom
reduzido:

- **Pallet:** retângulo com padrão de ripas (3 faixas horizontais mais
  claras sobre fundo `--cat-pallet`) — silhueta reconhecível sem
  detalhe excessivo.
- **Porta-paletes (rack):** retângulo com colunas verticais marcadas
  (traços a cada nível/vão) e leve profundidade sugerida por sombra
  interna — distinto de uma parede lisa.
- **Empilhadeira:** silhueta simplificada de corpo + garfos projetados
  na frente (na direção da rotação `0°`), cor `--cat-equipment`,
  proporção real (~1,2m × 2,3m de referência) — garfos tornam a direção
  óbvia à primeira vista.
- **Paleteira/transpaleteira:** silhueta menor e mais estreita que a
  empilhadeira, com garfos longos e finos, sem cabine.
- **Parede:** linha grossa sólida `--cat-structure`.
- **Porta/portão:** interrupção na parede + arco leve indicando abertura.
- **Doca:** retângulo na borda externa da parede com hachura diagonal +
  rótulo numérico.
- **Corredor:** faixa longa sem preenchimento sólido, apenas bordas
  tracejadas leves `--cat-storage`, para não competir visualmente com
  racks adjacentes.
- **Área:** preenchimento translúcido + borda tracejada na cor do
  subtipo (ver Design System § 2.3) + rótulo do nome da área centralizado.

Nenhum objeto usa um retângulo cinza genérico sem diferenciação visual
— é um requisito de produto (RF-43), não apenas estético.

## 5. Painel de propriedades — comportamento

- Título do painel = nome do tipo de objeto (ou nome customizado, se
  definido).
- Campos exibidos variam por `objectType` (RF-55) — usa
  `propertyFields` do catálogo (ver `ARCHITECTURE.md` § 4.2).
- Campos numéricos sempre com unidade visível e passo (`step`) coerente
  (ex.: posição em passos de 0,01m, rotação em passos de 1°/15°).
- Alteração em campo numérico aplica em tempo real no canvas (sem botão
  "aplicar"), com debounce curto para persistência.

## 6. Prevenção de conflitos touch vs. scroll da página

- O editor 2D ocupa uma rota dedicada em tela cheia (sem scroll de
  página ao redor do canvas) — elimina a ambiguidade entre gesto de
  canvas e scroll do navegador.
- Painéis (bottom sheets) capturam seus próprios gestos de
  arrastar/fechar sem propagar para o canvas por trás.

## 7. Feedback de salvamento

- Indicador textual discreto na barra superior: `Salvando…` → `Salvo às
  HH:MM` → (se erro) `Erro ao salvar · Tentar novamente` (link/botão).
- Nunca bloquear a interação do usuário enquanto salva (salvamento é
  sempre assíncrono e não-modal).
