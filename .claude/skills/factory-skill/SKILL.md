---
name: factory-skill
description: Cria simulações 3D de fábricas, armazéns e centros de distribuição — prédio, estruturas, estoque, equipamentos e o fluxo operacional animado (pallets, veículos, pessoas) com métricas de vazão, filas e gargalos — como página HTML autônoma com Three.js. Use quando o usuário pedir para simular, visualizar em 3D ou "ver rodando" uma fábrica/galpão/operação, especialmente a partir de um projeto (Layout + Fluxo) do ARGUS.LLP.
---

# factory-skill — simulação 3D de uma fábrica / armazém

Transforma um layout (de preferência um projeto do ARGUS.LLP) em uma cena 3D com a operação
rodando. Saída: `public/simulations/<slug>.html`, autônoma, servida no preview do Vercel em
`/simulations/<slug>.html`; adicione um card em `public/simulations/index.html`. Exemplo de referência
completo: `public/simulations/armazem-3d.html`.

> É a camada SIMULATION do README: separada do editor, que continua 100% 2D. Não importe
> nada de Three.js em `src/`. Para modelar uma máquina isolada em detalhe, use `machine-skill`;
> esta skill usa versões simplificadas das máquinas.

## 1. Obter o layout

Ordem de preferência:

1. **JSON de um projeto ARGUS.LLP** (`Layout` em `src/types/layout.ts`), colado pelo usuário ou
   exportado do `localStorage`. Mapeamento:
   - `x, y, width, length` em **cm** → metros (`/100`). O `y` 2D vira **z** em 3D;
     `rotationDeg` vira rotação em torno de Y (sinal invertido, pois o eixo Y da tela aponta
     para baixo). Use o centro/canto conforme o editor (confira em `src/features/editor`).
   - `widthM × heightM` = piso do galpão.
   - Categorias: `structure` (wall, column, door, gate, dock, stairs) → geometria fixa;
     `storage` (rack, drive-in, push-back, flow-rack, cantilever, shelf, storage-block) →
     estruturas com níveis e pallets; `equipment` (forklift, reach-truck, tug, order-picker,
     pallet-jack, conveyor…) → agentes ou estações; `area`/`area-*` → placas no piso com a cor do
     tipo; `flow`/`traffic-lane`/`pedestrian-lane` → faixas no piso que restringem rotas.
   - Alturas não existem no 2D: use `properties` quando houver, senão premissas (pé-direito 10 m,
     rack 4 níveis de 1,5 m) e liste-as.
2. **Fluxo** (`flowNodes`, `flowConnections`): cada nó é uma etapa; `linkedObjectId` aponta a
   área física onde ela acontece. `capacity`/`capacityUnit` e `processTime` alimentam a
   simulação; `flowType` da conexão define quem transporta (pallet/forklift → empilhadeira,
   people → pessoas, material/picking → carrinho ou esteira).
3. Sem projeto: monte o layout com o usuário (dimensões, zonas, sequência de processo).

## 2. Modelo de simulação (separado da renderização)

- **Eventos discretos com relógio próprio**: `simTime` avança `dt × speed` (1×–60×).
- **Entidades**: chegadas no(s) nó(s) iniciais (recebimento) com taxa configurável (Poisson);
  cada etapa é um servidor com capacidade (vazão → tempo de serviço; estoque → limite de fila)
  e fila FIFO.
- **Transporte**: agentes (empilhadeiras etc.) levam entidades entre as áreas ligadas, por um
  grafo de rotas sobre corredores/faixas (A* numa grade de 0,5 m, evitando racks e paredes).
  Velocidades típicas: empilhadeira 2,5 m/s, pessoa 1,2 m/s — premissas editáveis.
- **Semente fixa** (PRNG tipo mulberry32) para resultados reprodutíveis; botão de nova semente.
- Coerência com o 2D: mesmos nomes, cores (`FLOW_NODE_TYPE_COLORS`, `FLOW_CONNECTION_STYLE`) e
  rótulos (`FLOW_NODE_TYPE_LABELS`) do app.

## 3. Cena e interface

- Three.js 0.170.0 via import map do jsDelivr (igual à `machine-skill`), metros, Y para cima.
- Use `InstancedMesh` para pallets/caixas e itens repetidos (milhares de pallets sem travar).
- Câmeras: orbital, planta (vista de cima, para comparar com o 2D) e seguir um agente.
- **Navegação por dentro** (sempre incluir):
  - *Andar*: 1ª pessoa a 1,70 m, `W A S D` + mouse com pointer lock, `Shift` corre; no celular,
    joystick virtual + arrastar para olhar. Colisão com paredes, racks e máquinas.
  - *Dirigir*: uma empilhadeira do usuário (fora da simulação), câmera externa ou de cabine
    (`V`), garfo em `R/F`, mesma colisão.
  - Empilhadeiras da simulação param diante de quem anda/dirige; alerta quando uma máquina está
    a menos de 4 m ou quando a pessoa sai da faixa de pedestres para uma área de tráfego.
  - Minimapa 2D no canto com a posição de todos.
- Paredes e teto como planos com face só para dentro: de fora a câmera enxerga o interior, de
  dentro o galpão é fechado.
- Painel: play/pause/reset, velocidade da simulação, taxa de chegada, nº de agentes, toggles de
  camadas (estrutura, estoque, rotas, heatmap de tráfego no piso).
- **KPIs ao vivo**: vazão por etapa, ocupação (%) de cada servidor/agente, tamanho e espera média
  das filas, WIP, lead time. Destaque o **gargalo** (maior ocupação) na cena e no painel.
- Responsivo, com rótulos HTML (`CSS2DRenderer`) nas áreas.

## 4. Verificar

- Playwright (Chromium em `/opt/pw-browsers`): screenshot, console sem erros, a simulação avança
  e os KPIs mudam com o tempo.
- Teste também os modos Andar e Dirigir (simulando teclas) e rode horas simuladas em
  avanço rápido para detectar travamentos (ex.: duas máquinas esperando uma pela outra).
- Sanidade: a soma do que entra = o que sai + WIP; nenhum agente atravessa racks/paredes;
  vista de cima bate com o layout 2D original.

## 5. Entregar

Caminho do arquivo, premissas assumidas (alturas, velocidades, taxas), principais KPIs
observados e o gargalo encontrado. Publique como Artifact se o usuário quiser compartilhar.
