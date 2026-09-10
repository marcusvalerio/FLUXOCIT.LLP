# ARGUS.LLP — Logistics Planning & Intelligence

> Antes chamado FluxoCit.LLP. Mesmo produto, mesmo repositório, mesmo
> histórico — o nome mudou junto com o posicionamento: de "ferramenta
> para desenhar um galpão" para **plataforma que planeja o espaço e
> entende a operação que acontece nele**.

O ARGUS.LLP é organizado em camadas:

```
LAYOUT 2D        planejamento espacial (o núcleo, hoje)
    ↓
FLOW             modelo operacional
    ↓
INTELLIGENCE     análise e alertas sobre layout + fluxo
    ↓
SIMULATION       simulação operacional (camada futura, separada do editor 2D)
```

O planejamento é e continua **100% 2D**: a futura simulação será uma
camada independente de visualização, nunca uma conversão do editor em
um editor 3D.

Ferramenta de planejamento logístico em **2D**, organizada em torno de
**LAYOUT + FLUXO**: a Prancheta de Layout responde "onde cada coisa
fica" (paredes, áreas, porta-paletes, pallets, corredores, docas,
empilhadeiras e paleteiras, com escala real, snapping, undo/redo e
persistência); a Prancheta de Fluxo responde "como a operação
acontece" (nós de etapa de processo conectados por setas direcionais
tipadas, associáveis a áreas/objetos do Layout). Ambas pertencem ao
mesmo projeto e são persistidas juntas.

> Nesta fase o produto é exclusivamente 2D. Ver `docs/PRODUCT.md`.

> **Versão atual: local, sem conta.** O app abre direto em `/projects` —
> sem login, cadastro ou sessão — e guarda os projetos neste dispositivo
> (`localStorage`). Não depende de Cloudflare Worker, D1 nem de nenhuma
> API: o frontend sozinho (ex.: publicado no Vercel) já é o produto
> funcionando. O backend (`worker/`, `migrations/`) e o código de
> autenticação (`src/features/auth`, `RemoteLayoutRepository`) continuam
> no repositório, intactos, para a futura versão multiusuário — apenas
> fora do fluxo. Ver `docs/ARCHITECTURE.md` § Persistência.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Problema, público, proposta de valor, escopo MVP/pós-MVP |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Requisitos funcionais e não funcionais |
| [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) | Regras de escala, snapping, undo/redo, persistência |
| [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) | Fluxos de uso, incluindo considerações mobile |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura do frontend e do editor 2D |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Tecnologias escolhidas e justificativa |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Modelo de dados (Cloudflare D1) |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Passos manuais de deploy (conta Cloudflare, D1, Resend) |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Cores, tipografia, componentes |
| [`docs/UX.md`](docs/UX.md) | Diretrizes de interação do editor, mobile-first |

## Stack

React + TypeScript + Vite, Konva/react-konva (canvas 2D), Zustand
(estado), Tailwind CSS no frontend; Cloudflare Workers + D1 + Hono no
backend (conta real, e-mail/senha, projetos por usuário — ver
`docs/TECH_STACK.md`), hoje **desligado do fluxo**. O app roda o editor
inteiramente no navegador, com persistência local (`localStorage`)
atrás da mesma interface de repositório (`LayoutRepository`) — trocar
para o backend remoto é uma questão de reativar
`activateRemoteRepository` e definir `VITE_API_BASE_URL`.

## Rodando localmente

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # typecheck + build de produção
npm run test      # testes unitários (Vitest)
npm run lint      # lint (oxlint)
```

## Estado atual

- [x] Fase 1 — Definição do produto
- [x] Fase 2 — Arquitetura
- [x] Fase 3 — UX/UI e Design System
- [x] Fase 4 — Fundação técnica (app React/Vite, rotas, persistência local)
- [x] Fase 5 — Núcleo do editor 2D (canvas, grid, zoom/pan, seleção,
      mover, rotacionar, duplicar, excluir, undo/redo, snapping,
      propriedades, biblioteca de objetos, persistência)
- [x] Fase 6 — Refinamento do editor: seleção múltipla (shift-clique,
      marquee, long-press mobile), mover/duplicar/excluir/rotacionar em
      grupo, alinhar e distribuir, snapping entre objetos com guias
      visuais, handles de redimensionar/rotacionar (Konva Transformer)
      com snap de 15°, leitura de coordenadas ao vivo durante o
      arraste, pan via espaço/botão do meio no desktop (arraste
      simples agora faz seleção por marquee), refinamento visual de
      porta-paletes e corredor, indicador undo/redo sempre visível
- [x] Fase 7 — Funcionalidades logísticas: objeto de fluxo de circulação
      (pessoas/empilhadeiras/materiais, categoria própria "Fluxos"),
      endereçamento por código em porta-paletes e áreas, capacidade
      computada (vãos × níveis) do porta-paletes, área ocupada (m²)
      computada, identificação de equipamentos, sinalização visual de
      sobreposição entre porta-paletes/corredores

### Roadmap de evolução (3 fases, executadas nesta ordem)

- [x] Fase 2 — Editor profissional + escala real: ambiente com
      dimensões reais (m) definidas na criação e editáveis depois, piso
      distinto do espaço "fora" com grid restrito aos seus limites,
      réguas em metros acompanhando pan/zoom, leitura de coordenadas do
      cursor, comando "ajustar ao ambiente" (auto-executado ao abrir um
      layout), painel do ambiente (dimensões, área total, ocupação
      estimada), aviso visual de objeto parcial/totalmente fora do
      ambiente, snapping às bordas do ambiente
- [x] Fase 3 — Biblioteca logística + operação + exportação: 19 novos
      tipos de objeto com representação visual própria (armazenagem,
      operação, fluxo, equipamentos — ver "Biblioteca de objetos"
      abaixo), exportação do layout como imagem PNG preservando escala
      e composição do ambiente
- [x] Fase 1 — Design system + refinamento visual: paleta de marca
      (Authentic Black/White Sand/Cute Silver + Regal/Smooth/Endless/
      Royal Light Blue) e tipografia (Familjen Grotesk/Supreme/Sora)
      como tokens claro/escuro persistidos localmente, canvas
      (ambiente/grid/seleção) adaptado à nova paleta em ambos os temas,
      motion sutil (painéis, sheets, botões, inserção de objeto),
      correção definitiva do painel de propriedades no mobile
      (recolhe sob toque no canvas, nunca reabre sozinho, X nunca
      exclui)

### Roadmap LLP: Layout + Fluxo (em andamento)

- [x] P1 — Exportação PNG sempre com fundo opaco, incluindo objetos
      fora dos limites do ambiente (sem cortar), em ambos os temas
- [x] P2 — Biblioteca visual já auditada (todos os 27 tipos de objeto
      têm representação técnica 2D própria, herdada das fases
      anteriores)
- [x] P3/P4/P5/P6 — Prancheta de Fluxo: segunda prancheta do mesmo
      projeto (alternância Layout/Fluxo em desktop e mobile), nós de
      etapa de processo (criar/mover/editar/duplicar/excluir),
      conexões direcionais tipadas (materiais/pallets/pessoas/
      empilhadeiras/picking) via alça de arraste, associação de um nó
      a uma área/objeto do Layout (sem duplicar dados), persistência
      de Layout + Fluxo no mesmo projeto
- [x] P7 — Visualizar o fluxo sobreposto ao Layout: toggle "Mostrar
      fluxo sobre o layout" desenha as conexões (cor/estilo por tipo)
      entre os objetos associados, somente leitura
- [x] P8 — Evoluir regras espaciais e métricas: painel de Métricas
      (área total/armazenagem/operacional/circulação, ocupação,
      posições de pallet, contagem de equipamentos/docas/áreas,
      comprimento de corredores, etapas de fluxo); empilhadeira,
      paleteira e carrinho passam a registrar capacidade, raio de giro
      e largura mínima de corredor (informativo, preparado para
      validações automáticas futuras)
- [x] P9 — QA completo: adiciona inverter direção de conexão (ação
      antes ausente no fluxograma) e pinch-zoom de duas dedos na
      Prancheta de Fluxo (paridade de toque com o Layout); revalidados
      redimensionar, seleção múltipla/alinhar/distribuir, undo/redo,
      exportação com fundo sólido em mobile, e persistência completa
      Layout+Fluxo após reload — 63 testes automatizados, sem
      regressões encontradas

### Roadmap — Fase 8 e Fase 9

- [x] Fase 8 — Sistema de símbolos técnicos, catálogo de objetos
      expandido (estrutura/armazenagem/equipamentos/unitização),
      corredor inteligente (tipo/sentido) com regras espaciais
      ampliadas, painel de análise/alertas
- [x] Fase 9 — Conta, persistência real e experiência de projeto:
      backend próprio em **Cloudflare Workers + D1 + Hono** (nunca
      Supabase — decisão explícita, ver `docs/TECH_STACK.md`), cadastro
      com senha temporária por e-mail e troca obrigatória no primeiro
      acesso, sessão via cookie `HttpOnly`, projetos isolados por
      usuário, persistência remota com autosave e estados discretos,
      migração aditiva localStorage → D1, z-order consolidado, áreas
      sempre como camada de fundo, edição inline do nome de um nó de
      Fluxo direto no canvas (sem `window.prompt`), conexões de Fluxo
      como curvas com roteamento direcional básico — ver
      `docs/DEPLOYMENT.md` para os passos manuais de configuração da
      conta Cloudflare/Resend necessários antes de publicar em produção.

- [x] Fase 10 — Versão local para uso imediato da equipe:
      autenticação retirada do fluxo de navegação (entrada direta em
      `/projects`, `/editor/:layoutId` sem gate, nenhuma rota leva a
      `/login`), persistência local como backend ativo, frontend sem
      dependência obrigatória de Worker/D1/API (`VITE_API_BASE_URL`
      passa a ser opt-in explícito, sem fallback para `localhost:8787`)
      e `vercel.json` com fallback SPA para publicar o frontend sozinho

- [x] Fase 11 — Redesign do editor (UX de produto): cabeçalho com
      prancheta ativa ao centro e status de salvamento, biblioteca com
      busca e linhas densas (ícone técnico + função), painel direito com
      abas Propriedades/Ambiente/Métricas e estados vazios, controles
      flutuantes da prancheta (zoom, ferramentas, escala) e minimapa,
      réguas refinadas, navegação de prancheta explícita (botão direito,
      espaço, ferramenta Pan, dois dedos no toque) separada da
      movimentação de objetos, drag & drop da biblioteca para o ponto
      solto, etiqueta de dimensões na seleção e camada de motion curta
      com `prefers-reduced-motion` respeitado

- [x] Fase 12 — ARGUS.LLP: renomeação e posicionamento do produto (marca
      própria, camadas Layout → Flow → Intelligence → Simulation), sistema
      de ferramentas do editor (selecionar, mover prancheta, parede, área,
      medir, inserir objeto, com atalhos e faixa de contexto), seleção em
      área correta para objetos rotacionados, alças a partir das capacidades
      declaradas por tipo, histórico único de projeto cobrindo Layout **e**
      Fluxo, e autenticação da aplicação por modo (local sem conta /
      multiusuário contra Worker + D1) com ownership verificado no servidor

- [x] Fase 13 — Snapping avançado (extremidade, eixo e centro ao desenhar;
      alvos logísticos ao arrastar), Flow com metadata operacional
      (capacidade e tempo por tipo de etapa), camada de Intelligence
      determinística e explicável (regras de layout, fluxo e integração com
      recomendação), métricas derivadas do modelo operacional, Object
      Registry com papéis logísticos e limites de dimensão, e auditoria de
      autenticação/ownership validada ponta a ponta contra Worker + D1
      locais

Fora do escopo até aqui (aguardando instrução): editor 3D, times/
organizações compartilhadas, deploy automático (CI/CD). O frontend
pode ser publicado no Vercel a partir do GitHub (`vercel.json`); o
Worker, quando a versão multiusuário for retomada, é publicado via
`wrangler deploy` (`docs/DEPLOYMENT.md`).

## Biblioteca de objetos

- **Estrutura**: parede, porta, doca
- **Armazenagem**: porta-paletes, corredor, estante, bloco de
  armazenagem, área de picking, área de staging
- **Paletes**: pallet
- **Equipamentos**: empilhadeira, paleteira, carrinho de
  carga/plataforma, esteira transportadora, bancada de separação, mesa
  de packing, balança, impressora/estação de etiquetas, scanner/RF
- **Áreas**: recebimento, expedição, picking, staging, quarentena,
  devolução, armazenagem, circulação, administrativa, personalizada
  (genérica, com seletor de tipo) · área de conferência, área de
  expedição, área de recebimento (com representação visual própria)
- **Fluxos**: rota de circulação de pessoas/empilhadeiras/materiais,
  seta direcional, faixa de circulação, cruzamento, zona de segurança,
  faixa de pedestres

Todo objeto tem uma representação 2D própria (não um retângulo
genérico) e se integra à infraestrutura existente do editor: inserir,
selecionar, mover, rotacionar, redimensionar (quando aplicável),
duplicar, excluir, undo/redo, snapping, seleção múltipla, persistência
e touch.
