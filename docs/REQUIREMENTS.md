# ARGUS.LLP — Requisitos

Convenção: cada requisito tem um ID (`RF` = requisito funcional, `RNF` =
requisito não funcional), prioridade (`MVP`, `P1`, `P2`, `Futuro`) e
status (`DEFINIDO`, `PROPOSTO`).

## 1. Requisitos funcionais

### 1.0 Ambiente (espaço físico real)

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-00a | O usuário deve poder definir largura e comprimento reais (m) do ambiente ao criar um layout. | MVP | DEFINIDO |
| RF-00b | O usuário deve poder editar as dimensões do ambiente depois de criado. | MVP | DEFINIDO |
| RF-00c | O canvas deve exibir o ambiente como uma área distinta (piso) do espaço "fora" dele, com grid restrito aos seus limites. | MVP | DEFINIDO |
| RF-00d | O canvas deve exibir réguas com marcação em metros nas bordas superior e esquerda, acompanhando pan e zoom. | MVP | DEFINIDO |
| RF-00e | O usuário deve ter um comando para enquadrar o ambiente inteiro na tela. | MVP | DEFINIDO |
| RF-00f | O sistema deve sinalizar visualmente quando um objeto está parcial ou totalmente fora do ambiente, sem bloquear a ação. | MVP | DEFINIDO |
| RF-00g | O snapping deve considerar as bordas do ambiente como alvo, além de outros objetos e da grade. | P1 | DEFINIDO |
| RF-00h | O sistema deve exibir a área total do ambiente e uma estimativa de ocupação. | P1 | DEFINIDO |

### 1.1 Autenticação e conta

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-01 | O usuário deve poder criar uma conta informando e-mail; o sistema gera uma senha temporária e a envia por e-mail, exigindo troca no primeiro acesso (Fase 9). | MVP | DEFINIDO |
| RF-02 | O usuário deve poder autenticar-se com e-mail e senha. | MVP | DEFINIDO |
| RF-03 | O usuário deve poder encerrar sessão (logout). | MVP | DEFINIDO |
| RF-04 | O usuário deve poder recuperar/redefinir senha. | P1 | DEFINIDO |
| RF-05 | O sistema deve isolar os dados de cada usuário (nenhum usuário acessa, lista ou modifica projetos de outro usuário). | MVP | DEFINIDO |

### 1.2 Gestão de layouts (projetos)

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-10 | O usuário deve poder criar um novo layout, informando ao menos um nome. | MVP | DEFINIDO |
| RF-11 | O usuário deve poder listar os layouts existentes. | MVP | DEFINIDO |
| RF-12 | O usuário deve poder abrir um layout existente para edição. | MVP | DEFINIDO |
| RF-13 | O usuário deve poder renomear um layout. | MVP | DEFINIDO |
| RF-14 | O usuário deve poder excluir um layout. | MVP | DEFINIDO |
| RF-15 | O usuário deve poder duplicar um layout inteiro (copiar como novo). | P1 | PROPOSTO |
| RF-16 | O sistema deve salvar o layout automaticamente durante a edição (autosave) e/ou permitir salvar manualmente. | MVP | DEFINIDO |

### 1.3 Canvas / editor 2D

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-20 | O sistema deve exibir uma grade (grid) de referência no canvas, com espaçamento correspondente a uma unidade real (ex.: 1 m). | MVP | DEFINIDO |
| RF-21 | O usuário deve poder aplicar zoom in/out no canvas (roda do mouse, gestos de pinça no touch, botões). | MVP | DEFINIDO |
| RF-22 | O usuário deve poder navegar (pan) pelo canvas (arrastar com botão do meio/espaço no desktop; arrastar com um dedo/dois dedos no touch). | MVP | DEFINIDO |
| RF-23 | O usuário deve poder selecionar um objeto tocando/clicando nele. | MVP | DEFINIDO |
| RF-24 | O usuário deve poder selecionar múltiplos objetos (retângulo de seleção e/ou shift+clique). | P1 | DEFINIDO |
| RF-25 | O usuário deve poder mover um objeto selecionado arrastando-o. | MVP | DEFINIDO |
| RF-26 | O usuário deve poder rotacionar um objeto selecionado (alça de rotação e/ou campo numérico de ângulo). | MVP | DEFINIDO |
| RF-27 | O usuário deve poder duplicar um objeto selecionado. | MVP | DEFINIDO |
| RF-28 | O usuário deve poder excluir um objeto selecionado. | MVP | DEFINIDO |
| RF-29 | O usuário deve poder redimensionar objetos que suportam dimensão variável (ex.: paredes, áreas). | MVP | DEFINIDO |
| RF-30 | O sistema deve oferecer snapping à grade (snap to grid) ao mover/redimensionar objetos. | MVP | DEFINIDO |
| RF-31 | O sistema deve oferecer snapping entre objetos (bordas/centros alinhados) ao mover objetos. | P1 | DEFINIDO |
| RF-32 | O usuário deve poder desfazer (undo) e refazer (redo) ações no editor. | MVP | DEFINIDO |
| RF-33 | O sistema deve manter a posição/zoom da câmera do canvas coerente durante toda a sessão de edição (sem "pular" involuntariamente). | MVP | DEFINIDO |
| RF-34 | O canvas deve suportar layouts grandes sem travar a navegação (não limitado a uma área pequena fixa). | MVP | DEFINIDO |

### 1.4 Biblioteca de objetos

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-40 | O sistema deve oferecer uma biblioteca de objetos organizada por categoria (Estrutura, Armazenagem, Paletes, Equipamentos, Áreas, Fluxos, Outros). | MVP | DEFINIDO |
| RF-41 | O usuário deve poder inserir um objeto da biblioteca no canvas (arrastar da biblioteca para o canvas, ou tocar para inserir no centro da tela visível). | MVP | DEFINIDO |
| RF-42 | A biblioteca do MVP deve incluir, no mínimo: parede, área delimitada, porta, doca, porta-paletes, pallet, corredor, empilhadeira, paleteira. | MVP | DEFINIDO |
| RF-43 | Cada tipo de objeto deve ter uma representação visual 2D reconhecível (não um retângulo genérico sem distinção). | MVP | DEFINIDO |
| RF-44 | A arquitetura da biblioteca deve permitir adicionar novos tipos de objeto sem reescrever o núcleo do editor (catálogo extensível). | MVP | DEFINIDO |

### 1.5 Propriedades de objetos

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-50 | Ao selecionar um objeto, o sistema deve exibir um painel de propriedades específico para aquele tipo de objeto. | MVP | DEFINIDO |
| RF-51 | O painel de propriedades deve permitir editar posição (X, Y). | MVP | DEFINIDO |
| RF-52 | O painel de propriedades deve permitir editar rotação (graus). | MVP | DEFINIDO |
| RF-53 | O painel de propriedades deve permitir editar dimensões (comprimento/largura), quando aplicável ao tipo. | MVP | DEFINIDO |
| RF-54 | O painel de propriedades deve permitir editar nome/identificação do objeto. | MVP | DEFINIDO |
| RF-55 | O painel de propriedades não deve exibir campos irrelevantes para o tipo selecionado (ex.: pallet não mostra "número de docas"). | MVP | DEFINIDO |

### 1.6 Persistência

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-60 | O sistema deve persistir todos os objetos de um layout (tipo, posição, dimensão, rotação, propriedades). | MVP | DEFINIDO |
| RF-61 | O usuário deve poder fechar o editor e retomar exatamente de onde parou. | MVP | DEFINIDO |
| RF-62 | A persistência inicial pode ser local (navegador) enquanto a infraestrutura de backend/nuvem não estiver disponível; a versão com conta de usuário deve sincronizar em nuvem. | MVP | PROPOSTO |

### 1.7 Funcionalidades logísticas (Fase 7)

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-70 | O sistema deve permitir representar fluxos de circulação (pessoas, empilhadeiras, materiais) como objetos de rota direcional na categoria Fluxos, com estilo visual distinto por tipo. | P1 | DEFINIDO |
| RF-71 | Porta-paletes e áreas devem permitir um código de endereço/localização em texto livre. | P1 | DEFINIDO |
| RF-72 | O sistema deve computar e exibir a capacidade de um porta-paletes (vãos × níveis) sem exigir entrada manual redundante. | P1 | DEFINIDO |
| RF-73 | O sistema deve computar e exibir a área ocupada (m²) de um objeto do tipo "área". | P1 | DEFINIDO |
| RF-74 | Empilhadeiras e paleteiras devem permitir um código de identificação/patrimônio, independente do nome livre do objeto. | P1 | DEFINIDO |
| RF-75 | O sistema deve sinalizar visualmente quando dois porta-paletes/corredores se sobrepõem, sem bloquear a edição — ver `docs/BUSINESS_RULES.md` BR-60. | P1 | DEFINIDO |
| RF-76 | O usuário deve poder exportar o layout atual como imagem (PNG), preservando a escala e a composição do ambiente (piso, grid, objetos), sem os elementos de edição (seleção, transformer, guias, réguas). | P1 | DEFINIDO |
| RF-77 | O PNG exportado deve sempre ter fundo opaco (nunca transparente) e deve incluir objetos posicionados parcial ou totalmente fora do ambiente, sem cortá-los. | MVP | DEFINIDO |

### 1.8 Biblioteca logística ampliada (Fase 3)

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-80 | A biblioteca deve incluir os seguintes objetos de armazenagem, cada um com representação visual própria: estante, bloco de armazenagem, área de picking, área de staging. | P1 | DEFINIDO |
| RF-81 | A biblioteca deve incluir os seguintes objetos de operação, cada um com representação visual própria: esteira transportadora, bancada de separação, mesa de packing, balança, impressora/estação de etiquetas, scanner/RF, área de conferência, área de expedição, área de recebimento. | P1 | DEFINIDO |
| RF-82 | A biblioteca deve incluir os seguintes objetos de fluxo, cada um com representação visual própria: seta direcional, faixa de circulação, cruzamento, zona de segurança, faixa de pedestres. | P1 | DEFINIDO |
| RF-83 | A biblioteca deve incluir um objeto de equipamento "carrinho de carga/plataforma", com representação visual própria. | P1 | DEFINIDO |

### 1.9 Prancheta de Fluxo (LLP: Layout + Fluxo)

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-90 | O usuário deve poder alternar entre a Prancheta de Layout e a Prancheta de Fluxo dentro do mesmo projeto, em desktop e mobile. | MVP | DEFINIDO |
| RF-91 | O usuário deve poder criar nós de etapa de processo (Recebimento, Conferência, Armazenagem, Picking, Staging, Expedição, Devolução, Quarentena, Administrativa, Personalizada) na Prancheta de Fluxo. | MVP | DEFINIDO |
| RF-92 | O usuário deve poder selecionar, mover, renomear, adicionar observação, duplicar e excluir um nó de fluxo. | MVP | DEFINIDO |
| RF-93 | O usuário deve poder conectar dois nós através de uma alça de conexão, formando uma seta direcional com um tipo de fluxo (materiais, pallets, pessoas, empilhadeiras, picking). | MVP | DEFINIDO |
| RF-94 | O usuário deve poder selecionar e excluir uma conexão, alterar seu tipo de fluxo e identificação, e inverter sua direção (trocar origem/destino). | MVP | DEFINIDO |
| RF-95 | Excluir um nó deve excluir também as conexões que o referenciam (nunca deixar uma conexão "pendurada"). | MVP | DEFINIDO |
| RF-96 | O usuário deve poder associar um nó de fluxo a uma área/objeto já existente na Prancheta de Layout, sem duplicar os dados do objeto — apenas uma referência (`linkedObjectId`). | P1 | DEFINIDO |
| RF-97 | Layout e Fluxo devem ser persistidos juntos, no mesmo projeto (mesmo layout salvo), e restaurados juntos ao reabrir. | MVP | DEFINIDO |
| RF-98 | O usuário deve poder exibir/ocultar, sobre a Prancheta de Layout, as conexões de fluxo cujos dois extremos estejam associados a áreas/objetos do Layout — sem bloquear a edição do Layout. | P1 | DEFINIDO |

### 1.10 Métricas e propriedades de equipamento (P8)

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-99 | O sistema deve exibir um painel de métricas do projeto: área total, área de armazenagem, área operacional, área de circulação, ocupação, posições de pallet, quantidade de equipamentos, quantidade de docas, comprimento de corredores, quantidade de áreas e quantidade de etapas de fluxo. | P1 | DEFINIDO |
| RF-100 | Empilhadeira, paleteira e carrinho de carga/plataforma devem permitir registrar capacidade (kg), raio de giro (m) e largura mínima de corredor (m) — informativo nesta fase, preparado para validações espaciais automáticas futuras. | P2 | DEFINIDO |

### 1.11 Fase 8 — Inteligência visual e logística

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RF-101 | Todo objeto da biblioteca deve ter um desenho técnico 2D real (nunca quadrado colorido, emoji ou ícone genérico) exibido no card da biblioteca, e o objeto inserido no canvas (e na exportação PNG) deve usar exatamente o mesmo desenho — um único sistema de símbolos por tipo de objeto. | MVP | DEFINIDO |
| RF-102 | A biblioteca deve incluir os seguintes objetos de estrutura, cada um com representação visual própria: coluna/pilar, portão, escada. | P1 | DEFINIDO |
| RF-103 | A biblioteca deve incluir as seguintes variantes de armazenagem, cada uma com representação visual própria: drive-in, push-back, flow rack, cantilever. | P1 | DEFINIDO |
| RF-104 | A biblioteca deve incluir os seguintes equipamentos, cada um com representação visual própria: reach truck, rebocador, order picker. | P1 | DEFINIDO |
| RF-105 | A biblioteca deve incluir os seguintes objetos de unitização, cada um com representação visual própria: caixa, container, gaiola (pallet já existente). | P1 | DEFINIDO |
| RF-106 | Um corredor deve permitir definir um tipo de tráfego (pedestres/empilhadeira/misto/pallets/picking) e um sentido (mão única/mão dupla); o painel de propriedades deve exibir a largura mínima recomendada calculada para o tipo selecionado. | P1 | DEFINIDO |
| RF-107 | O sistema deve sinalizar visualmente (contorno no canvas) e em texto (painel de alertas) as seguintes situações, cada uma com severidade de atenção ou conflito: objeto invadindo um corredor, corredor com largura abaixo da recomendação, equipamento móvel sobreposto a parede/coluna, duas áreas operacionais sobrepostas, doca obstruída total ou parcialmente — sem bloquear a ação do usuário. | P1 | DEFINIDO |
| RF-108 | O painel de métricas do projeto deve incluir uma seção de alertas listando cada violação de regra espacial com uma mensagem legível (ex.: "Porta-paletes invade o corredor C03."), atualizada conforme o layout muda, com um estado "nenhum conflito" quando não há violações. | P1 | DEFINIDO |

## 2. Requisitos não funcionais

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| RNF-01 | A interface deve ser utilizável em telas de celular (mobile-first), com alvos de toque de tamanho adequado (mínimo ~40x40px). | MVP | DEFINIDO |
| RNF-02 | A interface deve também funcionar adequadamente em desktop (mouse/teclado), sem regressão de usabilidade. | MVP | DEFINIDO |
| RNF-03 | O canvas deve permanecer responsivo (interação fluida) com pelo menos algumas centenas de objetos em um layout. | MVP | DEFINIDO |
| RNF-04 | O sistema não deve implementar renderização, câmera ou objetos 3D nesta fase do produto. | MVP | DEFINIDO |
| RNF-05 | O sistema deve seguir boas práticas de segurança (sem segredos em código-fonte, autenticação/autorização adequadas, validação de entrada). | MVP | DEFINIDO |
| RNF-06 | O código deve ser organizado em uma arquitetura extensível (novos tipos de objeto, novas áreas, novas regras) sem exigir reescrita do núcleo. | MVP | DEFINIDO |
| RNF-07 | O sistema deve ter cobertura de testes automatizados para a lógica central do editor (estado, geometria, snapping, undo/redo). | MVP | DEFINIDO |
| RNF-08 | O sistema deve poder ser implantado (deploy) em ambiente de produção acessível via navegador. | MVP | DEFINIDO |

## 3. Fora de escopo (explícito)

- Visualização e edição 3D (câmera 3D, modelos volumétricos, orbit
  controls) — não implementar nesta fase.
- Simulação logística complexa (fluxo de pessoas/materiais em tempo
  real, otimização automática de layout).
- Integrações com WMS/ERP externos.
- Aplicativo nativo (iOS/Android) — o produto é web responsivo.
