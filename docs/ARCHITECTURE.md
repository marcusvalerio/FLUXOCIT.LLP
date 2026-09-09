# FluxoCit — Arquitetura

Ver também `docs/TECH_STACK.md` (escolhas de tecnologia e justificativa)
e `docs/DATABASE.md` (modelo de dados).

## 1. Visão geral

FluxoCit é uma aplicação **web SPA** (Single Page Application) escrita em
React + TypeScript, com o **editor 2D como núcleo do produto**. O
backend (Fase 9) é um Worker próprio na Cloudflare — **Cloudflare
Workers + D1 + Hono**, sem Supabase — acessado pelo frontend via HTTP
através de uma camada de repositório. Um usuário não autenticado (ou o
app antes da Fase 9) continua funcionando inteiramente no navegador,
sem servidor: o editor nunca depende diretamente de rede para renderizar
ou editar um layout.

```
┌──────────────────────────────────────────────────────────┐
│                        Navegador                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │  React App (Vite)                                    │   │
│  │  ┌───────────┐  ┌───────────────────────────────┐   │   │
│  │  │  Rotas /   │  │  Feature: editor                │   │   │
│  │  │  Auth      │  │  ┌─────────┐ ┌───────────────┐  │   │   │
│  │  │  Layouts   │  │  │ Canvas   │ │ Object catalog │  │   │   │
│  │  │  list      │  │  │ (Konva)  │ │ (extensível)   │  │   │   │
│  │  └───────────┘  │  └─────────┘ └───────────────┘  │   │   │
│  │                  │  ┌─────────┐ ┌───────────────┐  │   │   │
│  │                  │  │ Editor   │ │ Properties     │  │   │   │
│  │                  │  │ store    │ │ panel          │  │   │   │
│  │                  │  │ (Zustand)│ └───────────────┘  │   │   │
│  │                  │  └─────────┘                     │   │   │
│  │                  └────────────────────────────────────┘   │   │
│  │                     ▲                                     │   │
│  │                     │ LayoutRepository (interface)        │   │
│  └─────────────────────┼─────────────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
   LocalLayoutRepository       RemoteLayoutRepository
   (IndexedDB/localStorage —   (HTTP — ativa quando há
   usuário sem sessão, e        sessão autenticada)
   origem da migração)                │
                                       ▼
                          ┌─────────────────────────────┐
                          │  Cloudflare Worker (Hono)    │
                          │  cookie de sessão HttpOnly    │
                          │  ┌─────────┐  ┌────────────┐ │
                          │  │  /api/  │  │  /api/     │ │
                          │  │  auth/* │  │  projects/*│ │
                          │  └─────────┘  └────────────┘ │
                          └───────────────┬───────────────┘
                                          │
                                          ▼
                                 Cloudflare D1 (SQLite)
```

## 2. Frontend

### 2.1 Camadas

- **`app/`** — bootstrap: providers (roteador, tema, store raiz),
  definição de rotas, layout de página (shell com navegação).
- **`features/auth/`** — telas e lógica de login/cadastro/logout,
  proteção de rotas autenticadas.
- **`features/layouts/`** — listagem, criação, renomeação, exclusão de
  layouts (projetos). Consome `LayoutRepository`.
- **`features/editor/`** — o núcleo do produto (detalhado na seção 4).
- **`shared/ui/`** — componentes de design system (botões, inputs,
  painéis, ícones) reutilizáveis em toda a aplicação.
- **`shared/lib/`** — utilitários puros: conversão de unidades
  (cm↔m↔px), geometria (bounding box, rotação, distância), helpers de
  snapping.
- **`shared/data/`** — camada de repositório (`LayoutRepository` e suas
  implementações local/remota, ver § 2.3) e o cliente HTTP do Worker.
- **`types/`** — tipos compartilhados do modelo de objetos do editor.

### 2.2 Gerenciamento de estado

Dois domínios de estado, deliberadamente separados:

1. **Estado de aplicação** (sessão do usuário, lista de layouts,
   navegação) — Zustand, escopo simples, sem necessidade de histórico.
2. **Estado do editor** (objetos do layout corrente, seleção, câmera do
   canvas, histórico de undo/redo) — Zustand dedicado ao editor
   (`useEditorStore`), criado/destruído por sessão de edição (um layout
   aberto = uma instância de estado).

O estado do editor é a fonte única de verdade para o que é renderizado
no canvas **e** para o que é persistido — o Konva apenas reflete esse
estado (renderização controlada, não "canvas como dono do dado").

### 2.3 Camada de persistência (`LayoutRepository`)

Interface única consumida pelas features (`shared/data/LayoutRepository.ts`):

```ts
interface LayoutRepository {
  listLayouts(): Promise<LayoutSummary[]>;
  getLayout(id: string): Promise<Layout>;
  createLayout(input: NewLayoutInput): Promise<Layout>;
  renameLayout(id: string, name: string): Promise<void>;
  duplicateLayout(id: string): Promise<Layout>;
  deleteLayout(id: string): Promise<void>;
  saveLayoutObjects(id: string, objects: LayoutObject[]): Promise<void>;
  // + salvar o board de Fluxo (nós/conexões), ver types/flow.ts
}
```

- **`LocalLayoutRepository`** — IndexedDB/localStorage, ativa desde a
  Fase 4, sem dependências externas nem credenciais. Usada por qualquer
  visitante sem sessão, e é a origem dos dados na migração local→D1.
- **`RemoteLayoutRepository`** — HTTP contra o Worker Cloudflare
  (`shared/data/apiClient.ts` + `RemoteLayoutRepository.ts`), autenticado
  via cookie de sessão (`credentials: 'include'`, sem token manual).

Um **facade estável** (`shared/data/repository.ts`) expõe um único
objeto `layoutRepository` cujos métodos sempre delegam para a
implementação atualmente ativa; `activateRemoteRepository(userId)` e
`activateLocalRepository()` trocam o backend por baixo. O restante do
app sempre importa o mesmo `layoutRepository` e nunca sabe qual
implementação está ativa.

> **Versão atual (Fase 10) — local, sem conta.** O backend ativo é
> sempre o `LocalLayoutRepository`: nada no fluxo chama
> `activateRemoteRepository`, e ela é no-op enquanto `VITE_API_BASE_URL`
> não estiver definida (`isRemoteApiConfigured`, `shared/data/apiClient.ts`
> — não existe fallback implícito para `localhost:8787`, justamente para
> que uma chamada acidental não vire `Failed to fetch`/CORS em produção).
> Retomar a versão multiusuário é reativar a chamada em
> `useAuthStore.bootstrap/login` e definir a variável — o resto desta
> seção segue valendo. Isso garante que o núcleo do editor nunca
dependa diretamente do Worker, do D1, do IndexedDB ou de qualquer outro
detalhe de infraestrutura.

### 2.4 Migração localStorage → D1 (Fase 9)

Ao autenticar, `shared/data/migration.ts` verifica se há layouts locais
ainda não importados (`getPendingLocalLayouts`, cruzando com uma lista
de IDs já migrados guardada em `localStorage` sob a chave
`fluxocit:migration-state`) e oferece importá-los como **novos**
projetos remotos (`importAllPendingLocalLayouts`) — a migração é
estritamente aditiva: nunca sobrescreve um projeto remoto existente, e
revisitar a tela não duplica um layout já importado. Os dados locais
permanecem intactos no navegador após a migração (não são apagados).

## 3. Autenticação e autorização (Fase 9 — fora do fluxo na Fase 10)

> **Estado atual:** esta seção descreve o backend de contas, que
> continua implementado e testado em `worker/`, mas **não faz parte do
> fluxo de navegação**. O app entra direto em `/projects` e
> `/editor/:layoutId` sem nenhum gate (`src/app/App.tsx`); `AuthGate`,
> `useAuthStore` e as páginas em `src/features/auth/pages` permanecem no
> repositório, sem uso, para a retomada da versão multiusuário. Nenhuma
> rota leva o usuário a `/login`.

- **Cadastro:** o usuário informa e-mail; o Worker gera uma senha
  temporária aleatória, cria a conta com `must_change_password = true`
  e envia a senha por e-mail (`EmailSender`, ver `TECH_STACK.md`) — não
  existe cadastro com senha escolhida pelo próprio usuário no primeiro
  acesso.
- **Login:** e-mail + senha; a senha é verificada contra o hash PBKDF2
  guardado em `users.password_hash` (nunca texto puro). Se
  `must_change_password` estiver ligado, toda rota autenticada redireciona
  para a troca de senha antes de liberar o resto do app (`RequireAuth`,
  ver `app/App.tsx`) — mesmo que o usuário navegue direto para uma URL do
  editor.
- **Sessão:** um token aleatório de 32 bytes é gerado no login/troca de
  senha; só o hash SHA-256 desse token vai para `sessions.id` no D1. O
  token bruto vive exclusivamente num cookie `HttpOnly` + `Secure`
  (quando HTTPS) + `SameSite=Lax` — nunca em `localStorage`/`sessionStorage`,
  reduzindo a superfície de um roubo de sessão via XSS.
- **Recuperação de senha:** fluxo por token de uso único
  (`password_reset_tokens`, expira e é marcado `used_at` após o uso),
  também entregue por e-mail — nunca exibido na tela.
- **Isolamento de dados (RF-05, BR-40):** toda query de `projects` no
  Worker é filtrada por `user_id` na própria query SQL (`worker/src/db.ts`),
  nunca só no frontend — um usuário que tente ler/renomear/excluir o
  projeto de outro usuário recebe 404 (não 403, para não confirmar que o
  ID existe). Validado por teste automatizado (`worker/test/projects.test.ts`)
  simulando dois usuários e todas as operações cruzadas.
- **Guarda de rotas no frontend** (`features/auth/AuthGate.tsx`) é
  defesa em profundidade para UX (evita renderizar telas que vão falhar
  por 401), nunca a única barreira — a barreira real é o filtro por
  `user_id` no Worker.

## 4. Arquitetura do editor 2D

### 4.1 Modelo de objetos do canvas

Todo objeto do layout é uma instância de `LayoutObject`:

```ts
interface LayoutObject {
  id: string;
  objectType: ObjectTypeKey;   // ex.: "pallet", "rack", "wall", "forklift"
  category: ObjectCategory;    // "structure" | "storage" | "pallet" | "equipment" | "area" | "flow" | "other"
  name?: string;
  x: number;        // cm, canto superior-esquerdo do bounding box pré-rotação
  y: number;        // cm
  width: number;     // cm
  length: number;    // cm
  rotationDeg: number; // [0, 360)
  zIndex: number;
  properties: Record<string, unknown>; // específico do tipo
}
```

### 4.2 Catálogo de tipos (extensível)

Cada tipo de objeto é definido uma vez em um catálogo central
(`ObjectTypeDefinition`), não espalhado pelo código:

```ts
interface ObjectTypeDefinition {
  key: ObjectTypeKey;
  category: ObjectCategory;
  label: string;
  defaultWidth: number;   // cm
  defaultLength: number;  // cm
  resizable: boolean;
  render: (obj: LayoutObject, ctx: RenderContext) => ReactNode; // componente Konva
  propertyFields: PropertyFieldDefinition[]; // o que aparece no painel de propriedades
}
```

Adicionar um novo objeto = adicionar uma entrada no catálogo + um
componente de renderização — **não** exige alterar o núcleo do canvas,
seleção, drag, undo/redo ou persistência. Isso cumpre RF-44/RNF-06.

### 4.3 Núcleo do canvas

- **Stage/Layer (Konva):** uma `Stage` por editor; camadas separadas
  para: grid (estático, redesenha só no zoom/pan), objetos (dinâmico),
  overlay de seleção/transformação (alças, guias de snap).
- **Câmera:** estado `{ x, y, zoomLevel }` independente dos objetos;
  transforma coordenadas de mundo (cm) → coordenadas de tela (px) via
  `scale_px_per_meter` do layout combinada ao `zoomLevel` da sessão.
- **Seleção:** conjunto de IDs selecionados no `useEditorStore`; o
  `Transformer` do Konva é anexado aos nós selecionados para
  mover/rotacionar/redimensionar com feedback visual imediato.
- **Snapping:** função pura (`shared/lib/snap.ts`) aplicada durante o
  `dragMove`/`transform`, antes de commitar a posição final no estado —
  primeiro tenta snap a outros objetos (limiar em px de tela), depois
  snap à grade (BR-20/BR-21).
- **Undo/Redo:** middleware de histórico que grava um snapshot
  (ou diff) do array de `LayoutObject[]` a cada ação "committada"
  (mouseup/touchend de drag, edição de propriedade, inserir, duplicar,
  excluir) — nunca durante o arraste em si, para não poluir o histórico
  (BR-30/BR-31).
- **Persistência:** `useEditorStore` expõe os objetos atuais;
  `saveLayoutObjects` é chamado por um efeito com debounce (autosave) e
  por ação explícita do usuário (RF-16, BR-41).

### 4.4 Por que Konva.js (não SVG/Canvas puro)

- Suporte nativo a hit-testing por forma (necessário para seleção
  precisa em objetos rotacionados).
- `Transformer` pronto para mover/rotacionar/redimensionar com
  handles, incluindo suporte a touch.
- Melhor performance que SVG puro para centenas de objetos (RNF-03),
  sem a complexidade de gerenciar um canvas HTML5 imperativo à mão.
- Não introduz nenhuma dependência 3D — é estritamente 2D, alinhado à
  regra de não implementar 3D nesta fase (RNF-04).

## 5. Interação touch/mobile

- Gestos do Konva (`onTouchStart/Move/End`) tratam pan de um dedo e
  drag de objeto; pinça (dois dedos) é tratada manualmente para zoom,
  com `preventDefault` restrito à área do canvas para não capturar
  scroll da página fora dele.
- Painéis (biblioteca de objetos, propriedades) são componentes de UI
  fora do canvas (HTML/React normal), não desenhados dentro do Konva —
  mantém acessibilidade e reaproveita o design system.

## 6. Segurança

- Nenhum segredo no código-fonte. O frontend só conhece
  `VITE_API_BASE_URL` (a URL pública do Worker, não é um segredo) via
  `.env` não versionado (`.env.example` versionado como referência). O
  único segredo real do sistema — `RESEND_API_KEY` — vive exclusivamente
  como secret do Worker (`wrangler secret put`), nunca em variável de
  ambiente do frontend, nunca em código, nunca em resposta de API.
- Senha de usuário: nunca texto puro, nunca SHA-256 puro — PBKDF2-HMAC-SHA256
  com salt aleatório por usuário (ver `TECH_STACK.md` § Backend).
- Token de sessão: só o hash SHA-256 é persistido; o token bruto só
  existe no cookie `HttpOnly`/`Secure`/`SameSite=Lax` do navegador.
- Validação de entrada no frontend (formulários) **e** filtro por
  `user_id` em toda query do Worker como barreira real — o frontend
  nunca é a única defesa de isolamento de dados.

## 7. Preparação para regras espaciais e fluxos (futuro)

- O modelo `LayoutObject` já carrega `category` e bounding box
  suficientes para, no futuro, rodar checagem de sobreposição
  (bounding box / polígono) sem remodelar dados.
- Objetos de categoria `flow` (rotas, setas de sentido) podem ser
  adicionados ao catálogo como um novo tipo de objeto (ex.: polilinha)
  sem alterar o núcleo — a arquitetura de catálogo extensível cobre
  esse caso quando for priorizado (Fase 7).

## 8. Não escopo desta arquitetura

- Sem renderização 3D, sem `three.js`/`react-three-fiber`, sem câmera
  perspectiva — reforço explícito de RNF-04.
- Sem backend próprio (servidor HTTP customizado) no MVP.
- Sem app nativo — apenas web responsivo.
