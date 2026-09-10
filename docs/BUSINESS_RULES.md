# ARGUS.LLP — Regras de Negócio

## 0. Ambiente (espaço físico real)

- BR-00: Todo layout tem um **ambiente** — largura e comprimento reais
  em metros, definidos na criação e editáveis depois. Layouts criados
  antes desta regra existir (sem dimensões salvas) usam um ambiente
  padrão de 20 × 15 m até o usuário configurar o real.
- BR-01b: O ambiente é a referência visual principal do canvas — um
  piso branco delimitado por borda, com grid restrito aos seus limites
  (fora do ambiente não há grid, reforçando "isto não é meu espaço").
- BR-02b: Objetos podem ser posicionados fora do ambiente ou
  parcialmente fora dele — isso nunca é bloqueado — mas o sistema
  sinaliza visualmente (contorno tracejado âmbar no objeto + aviso no
  painel de propriedades) quando isso acontece.
- BR-03b: A ocupação exibida no painel do ambiente é uma **estimativa**
  (soma de área ocupada por objetos de estrutura/armazenagem/
  equipamento/pallet, dividida pela área do ambiente) — objetos
  sobrepostos (ex.: pallet sobre porta-paletes) são contados mais de
  uma vez, então o número é direcional, não uma medida de ocupação real
  livre de sobreposição.

## 1. Escala e unidades

- BR-01: Toda dimensão física (posição, comprimento, largura) é
  armazenada internamente em **centímetros** (inteiro ou decimal) para
  evitar erros de arredondamento de ponto flutuante em metros; a
  interface exibe valores em **metros com 2 casas decimais** (ex.:
  `2,70 m`).
- BR-02: Cada layout possui uma **escala de referência** (pixels do
  canvas por metro real), usada para converter entre coordenadas de
  desenho (canvas) e coordenadas reais (mundo). A escala é uma
  propriedade do layout, não de cada objeto.
- BR-03: O grid do canvas representa sempre uma unidade real fixa (ex.:
  1 m por célula principal, com subdivisões de 0,1 m), independente do
  nível de zoom — o zoom altera o tamanho em pixels da célula, não o
  significado dela.
- BR-04: A rotação de um objeto é armazenada em graus, no intervalo
  `[0, 360)`, sentido horário, com `0°` como orientação padrão de
  fábrica do tipo de objeto.

## 2. Objetos de layout

- BR-10: Todo objeto de layout pertence a exatamente um **tipo de
  objeto** (catálogo), do qual herda: categoria, dimensões padrão,
  representação visual base e quais propriedades são editáveis.
- BR-11: Um objeto pode sobrescrever as dimensões padrão do seu tipo
  apenas se o tipo permitir dimensão variável (ex.: parede e área
  permitem; pallet e empilhadeira têm dimensão fixa por padrão, mas
  podem ter variantes de tamanho pré-definidas no catálogo).
- BR-12: Todo objeto de layout tem posição `(x, y)` referente ao **canto
  superior esquerdo do seu bounding box antes da rotação**, mais o
  ângulo de rotação aplicado em torno do centro do bounding box. Isso
  mantém consistência entre o modelo de dados e a renderização.
- BR-13: Objetos do tipo "área" (recebimento, expedição, picking,
  staging, quarentena, devolução, armazenagem, circulação,
  administrativa, personalizada) são polígonos/retângulos que podem
  conter outros objetos visualmente sobrepostos — área nunca bloqueia a
  inserção de outros objetos sobre ela.
- BR-14: Excluir um objeto é uma ação reversível durante a sessão via
  undo; não existe "lixeira" persistente entre sessões no MVP.

## 3. Snapping e grid

- BR-20: Quando o snap à grade está ativo, a posição de um objeto é
  arredondada para o múltiplo mais próximo do passo de grid configurado
  (padrão: 0,1 m; configurável pelo usuário entre valores pré-definidos,
  ex.: 0,05 m / 0,1 m / 0,5 m / 1 m).
- BR-21: O snap entre objetos (quando implementado) tem prioridade sobre
  o snap à grade quando ambos se aplicam a uma distância menor que o
  limiar de snap (ex.: 10px na tela, independente do zoom).
- BR-22: O usuário pode desativar temporariamente o snapping (ex.:
  mantendo uma tecla/modificador pressionado, ou alternando um
  controle) para posicionamento livre.

## 4. Undo/Redo

- BR-30: Toda ação que altera o estado do layout (criar, mover,
  rotacionar, redimensionar, duplicar, excluir, editar propriedade) gera
  uma entrada no histórico de undo.
- BR-31: Ações de navegação (zoom, pan, seleção) **não** geram entrada
  no histórico de undo.
- BR-32: O histórico de undo é limitado a um tamanho máximo razoável
  (ex.: 100 ações) por questão de performance/memória; ao exceder,
  descarta-se a entrada mais antiga.
- BR-33: O histórico de undo é válido apenas durante a sessão de edição
  corrente; não é persistido entre sessões.

## 5. Persistência e propriedade dos dados

- BR-40: Um projeto (Layout + Fluxo) pertence a um único usuário; ninguém
  acessa, lista, renomeia ou exclui o projeto de outro usuário — isolamento
  por dono, aplicado na própria consulta ao banco, não só na interface
  (ver `ARCHITECTURE.md` § 3 e `DATABASE.md` § 3). Não há conceito de
  organização/workspace compartilhado nesta fase.
- BR-41: Autosave ocorre em intervalos curtos (ex.: a cada alteração
  relevante, com debounce de ~1–2s) e/ou ao perder foco/fechar o editor;
  o usuário também pode forçar salvar manualmente.
- BR-42: Nenhuma alteração é considerada "perdida" silenciosamente — se
  o autosave falhar, a interface deve comunicar o estado de erro ao
  usuário.

## 6. Nomenclatura e identificação

- BR-50: Cada layout tem um nome definido pelo usuário, não vazio.
- BR-51: Objetos podem ter um nome/identificação opcional definido pelo
  usuário (ex.: "Rack A-01"); quando ausente, a interface exibe o nome
  padrão do tipo (ex.: "Porta-paletes").

## 7. Regras espaciais

- BR-60 (implementada, Fase 7 — escopo reduzido): porta-paletes e
  corredores não deveriam ocupar a mesma área física — o sistema detecta
  sobreposição por bounding box (considerando rotação) entre esses dois
  tipos e sinaliza visualmente (contorno tracejado vermelho no objeto +
  aviso no painel de propriedades), sem bloquear a ação do usuário.
  Deliberadamente **não** aplicada a paredes/portas/docas/equipamentos:
  docas ficam sobre paredes por definição, paredes se encontram em
  cantos, e equipamentos são móveis — incluir essas combinações geraria
  falsos positivos. Ver `src/shared/lib/spatialRules.ts`.
- BR-61 (implementada, Fase 8): Corredores têm um tipo de tráfego
  (`properties.corridorType`: pedestres/empilhadeira/misto/pallets/
  picking) e uma largura mínima recomendada associada a esse tipo — ver
  `CORRIDOR_MIN_WIDTH_CM` em `src/shared/lib/spatialRules.ts`. São
  figuras de referência geral (não uma norma certificada), usadas apenas
  para sinalizar (`findNarrowCorridors`), nunca para bloquear a
  colocação. O painel de propriedades exibe a recomendação calculada
  para o tipo selecionado.
- BR-62 (P8, preparação): Empilhadeira, paleteira e carrinho de
  carga/plataforma carregam capacidade (kg), raio de giro (m) e
  largura mínima de corredor (m) como propriedades informativas
  (`properties.capacityKg`/`turningRadiusM`/`minAisleWidthM`) — nenhuma
  validação automática as usa ainda (ex.: bloquear equipamento em
  corredor estreito demais); existem para não exigir migração de dados
  quando essa validação for priorizada. Ver `EQUIPMENT_SPEC_FIELDS` em
  `src/features/editor/objects/catalog.ts`.

## 8. Endereçamento e capacidade

- BR-70: Porta-paletes e áreas podem ter um código de endereço/local
  (`code`) em texto livre (ex.: `A-01-03`), sem formato imposto pelo
  sistema — cada operação tem sua própria convenção de endereçamento.
- BR-71: A capacidade de um porta-paletes (em posições de pallet) é
  sempre `vãos × níveis`, computada automaticamente e somente exibida
  (não editável diretamente) — evita a capacidade divergir da
  configuração real do rack.
- BR-72: A área ocupada (m²) de um objeto do tipo "área" é sempre
  computada a partir de largura × comprimento, nunca armazenada
  separadamente, para nunca divergir das dimensões reais do objeto.

## 9. Prancheta de Fluxo

- BR-80: Layout e Fluxo são duas representações do **mesmo projeto**
  (mesmo `Layout` salvo) — nunca projetos separados. Ver
  `src/types/flow.ts` e `Layout.flowNodes`/`Layout.flowConnections`.
- BR-81: Um nó de fluxo não tem escala física real (não é medido em
  metros) — sua posição no canvas de Fluxo é livre, de diagrama, e não
  guarda nenhuma relação de coordenadas com o canvas de Layout.
- BR-82: Excluir um nó de fluxo exclui em cascata toda conexão que o
  referencia como origem ou destino — nunca deixa uma conexão
  apontando para um nó inexistente.
- BR-83: Uma conexão não pode ligar um nó a si mesmo, e não pode haver
  duas conexões com a mesma origem e destino (evita duplicidade
  acidental ao tentar conectar duas vezes).
- BR-84: A associação de um nó de fluxo a uma área/objeto do Layout é
  uma referência (`linkedObjectId` apontando para `LayoutObject.id`),
  nunca uma cópia dos dados do objeto — evita divergência entre as
  duas pranchetas.
- BR-85: A Prancheta de Fluxo não tem histórico de undo/redo nesta
  fase (diferente do Layout) — cada mutação é aplicada e persistida
  diretamente.
- BR-86: A sobreposição do fluxo no Layout (toggle "Mostrar fluxo
  sobre o layout") só desenha uma conexão quando **ambos** os nós
  extremos estão associados a um objeto do Layout existente —
  conexões sem associação completa não aparecem no Layout (apenas na
  própria Prancheta de Fluxo). É somente leitura: não é selecionável
  nem editável a partir do Layout. Ver `src/features/editor/canvas/FlowOverlay.tsx`.

## 10. Fase 8 — Inteligência visual e logística

- BR-90: Todo objeto da biblioteca tem um desenho técnico 2D em vista
  superior (nunca um quadrado colorido genérico ou emoji) renderizado
  pelo **mesmo componente React/Konva** em três lugares: card da
  biblioteca (`ObjectThumbnail`), objeto no canvas (`ObjectNode`) e
  exportação PNG (`ObjectRenderStatic`) — um único sistema de símbolos
  (`OBJECT_CATALOG[type].render`), nunca implementações visuais
  divergentes para o mesmo tipo. Ver `src/features/editor/objects/`.
- BR-91: A biblioteca cobre as categorias Estrutura, Armazenagem,
  Equipamentos e Unitização (rótulo de exibição da categoria interna
  `pallet`) com múltiplas variantes por categoria (ex.: armazenagem:
  porta-paletes, drive-in, push-back, flow rack, cantilever, estante,
  bloco de armazenagem) — cada tipo tem um desenho técnico distinto o
  suficiente para ser reconhecível sem depender do rótulo de texto.
- BR-92: Corredores têm um sentido de circulação
  (`properties.direction`: mão única/mão dupla), puramente informativo
  nesta fase — ainda não há validação de fluxo unidirecional.
- BR-93: Regras espaciais expandidas (todas em
  `src/shared/lib/spatialRules.ts`, agregadas por
  `computeSpatialViolations`), cada uma com severidade 🟡 atenção ou 🔴
  conflito e mensagem legível referenciando o endereço/código do objeto
  quando definido:
  - corredor bloqueado: objeto de armazenagem/estrutura/equipamento
    cujo bounding box invade um corredor;
  - corredor muito estreito: largura abaixo da recomendação do seu
    tipo (ver BR-61);
  - conflito equipamento×estrutura: equipamento móvel (empilhadeira,
    paleteira, reach truck, rebocador, order picker, carrinho)
    sobrepondo parede/coluna — portas/portões/docas são excluídos por
    serem aberturas que o equipamento deve atravessar;
  - área operacional sobreposta: duas zonas logísticas (Área, Área de
    picking/staging/conferência/expedição/recebimento) com footprint
    sobreposto;
  - doca obstruída: objeto cobrindo o footprint de uma doca — crítico
    quando a cobertura é predominante (≥60% da área da doca), atenção
    quando parcial.
  Nenhuma dessas regras bloqueia a ação do usuário — apenas sinaliza
  visualmente (contorno tracejado no canvas) e em texto (painel de
  métricas).
- BR-94: O painel de métricas ("Métricas do projeto") exibe também os
  alertas de `computeSpatialViolations` como lista com ícone/cor por
  severidade, com um estado neutro "Nenhum conflito detectado" quando
  vazio — reaproveita o painel/toggle já existente em vez de criar uma
  tela nova, mantendo a prancheta como foco principal da interface. Ver
  `src/features/editor/metrics-panel/MetricsPanel.tsx`.
