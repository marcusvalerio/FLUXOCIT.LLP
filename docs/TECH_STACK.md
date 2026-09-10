# ARGUS.LLP — Stack Tecnológica

> Decisões técnicas de baixo risco assumidas com autonomia, conforme
> autorizado no prompt mestre. Onde há dependência de credencial/conta
> externa (ex.: conta Cloudflare, conta Resend), isso é sinalizado
> explicitamente — ver `DEPLOYMENT.md` para a lista exata de passos
> manuais.

## 1. Frontend

| Camada | Escolha | Justificativa |
|--------|---------|----------------|
| Linguagem | TypeScript | Segurança de tipos para o modelo de objetos do editor, que é o núcleo do produto. |
| Framework | React 18 | Ecossistema maduro, bom suporte a bibliotecas de canvas, equipe/IA já opera bem nele. |
| Build tool | Vite | Build e dev server rápidos, essencial para iterar via ambiente remoto/mobile. |
| Roteamento | React Router v6 | Padrão de mercado, simples para as rotas do MVP (login, lista, editor). |
| Estilo | Tailwind CSS | Produtividade alta, consistente com um design system tokenizado (ver `DESIGN_SYSTEM.md`), mobile-first por padrão. |
| Estado global (app) | Zustand | Leve, sem boilerplate, adequado para estado de UI + estado do editor. |
| Estado do editor / histórico | Zustand + middleware de histórico próprio (undo/redo) | Necessidade de controle fino sobre o que entra no histórico (ver `BUSINESS_RULES.md` BR-30..33); implementação própria evita dependências pesadas. |
| Canvas 2D | Konva.js + react-konva | Motor de canvas 2D com suporte nativo a: seleção, transformação (mover/rotacionar/redimensionar), eventos de toque, camadas (layers) e boa performance com muitos objetos. Evita reinventar manipulação de canvas em baixo nível. |
| Formulários / inputs numéricos | Componentes próprios (leves) | O painel de propriedades tem necessidades específicas (unidades, conversão m↔px); não justifica biblioteca externa de formulários no MVP. |
| Testes unitários/integração | Vitest + React Testing Library | Integração nativa com Vite, rápido. |
| Testes E2E (pós-MVP) | Playwright | Já disponível no ambiente; útil para validar fluxos de touch/canvas mais adiante. |

## 2. Backend / dados

**DECISÃO (Fase 9 — substituiu a proposta original de Supabase por
instrução explícita do usuário):** **Cloudflare Workers + D1 + Hono**,
sem nenhuma dependência de Supabase.

| Camada | Escolha | Justificativa |
|--------|---------|----------------|
| Runtime de API | Cloudflare Workers | Sem servidor para manter, deploy via `wrangler`, roda na mesma conta/CDN que hospeda o frontend. |
| Framework HTTP | Hono | Router leve e tipado, feito para o runtime de Workers (`hono/factory` para middleware tipado), sem overhead de um framework Node tradicional. |
| Banco de dados | Cloudflare D1 (SQLite gerenciado) | Banco relacional real dentro do mesmo ecossistema Cloudflare — evita uma segunda conta/provedor externo só para o banco. Migrations versionadas em `worker/migrations/`. |
| Hash de senha | PBKDF2-HMAC-SHA256 (100.000 iterações, salt aleatório de 16 bytes) via `crypto.subtle` (Web Crypto nativa do runtime de Workers) | Atende à exigência explícita de **nunca** guardar senha em texto puro nem usar SHA-256 puro como substituto de password hashing — `crypto.subtle` é o único mecanismo criptográfico forte disponível nativamente no runtime de Workers, sem adicionar uma dependência externa de hashing. |
| Sessão | Cookie `HttpOnly` + `Secure` (quando HTTPS) + `SameSite=Lax` carregando um token aleatório de 32 bytes; só o **hash SHA-256** do token é persistido em `sessions.id` | Um vazamento do banco sozinho não permite forjar sessões existentes (o token bruto nunca é gravado). Evita guardar token de sessão em `localStorage`, mais exposto a XSS. |
| Envio de e-mail | Abstração `EmailSender` (`worker/src/email.ts`) com duas implementações: `ConsoleEmailSender` (dev — loga o e-mail no terminal do `wrangler dev`) e `ResendEmailSender` (produção — HTTP API da Resend) | O binding nativo `send_email` do Cloudflare Workers só entrega para um endereço de destino fixo e pré-verificado — estruturalmente incompatível com enviar a senha temporária para o e-mail que o usuário acabou de digitar no cadastro. Um provedor HTTP (Resend) resolve isso sem trocar de plataforma; a interface `EmailSender` mantém o provedor trocável. A chave da API (`RESEND_API_KEY`) é um secret do Worker (`wrangler secret put`), nunca chega ao frontend. |
| Testes do backend | `@cloudflare/vitest-pool-workers` (Vitest + Miniflare) | Roda os testes contra um D1 real localmente (aplica as migrations antes de cada suíte), sem precisar de conta Cloudflare nem mocks do banco. |

**Por que não Supabase:** a proposta original (registrada abaixo, por
histórico) foi descartada por instrução explícita do usuário na Fase 9,
que definiu a arquitetura como Cloudflare Workers + D1 desde o início
da integração de conta/persistência real — nenhuma integração com
Supabase chegou a ser criada.

**Implicação de credencial/configuração manual:** ativar o backend em
produção exige passos manuais numa conta Cloudflare real (criar o banco
D1, publicar o Worker, configurar a Resend) — nada disso é simulado ou
inventado neste repositório. A lista exata de passos e o que cada um
faz está em `DEPLOYMENT.md`. Em desenvolvimento local (`wrangler dev`),
tudo funciona sem nenhuma credencial: o D1 roda localmente (SQLite em
disco) e o envio de e-mail cai automaticamente no `ConsoleEmailSender`.

**Repositório de persistência do frontend:** o núcleo do editor nunca
fala com o Worker diretamente — consome a interface `LayoutRepository`
(ver `ARCHITECTURE.md`), que tem uma implementação local
(`LocalLayoutRepository`, IndexedDB/localStorage, usada por usuários não
autenticados e como origem da migração) e uma implementação remota
(`RemoteLayoutRepository`, HTTP contra o Worker), trocadas em tempo de
execução conforme o estado de sessão (`useAuthStore`).

<details>
<summary>Proposta original (Fase 1-8, substituída — mantida apenas como histórico)</summary>

Usar **Supabase** (Postgres gerenciado + Auth + Storage) como backend as
a service, com Row Level Security cobrindo o isolamento por
organização e chaves públicas (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) no
frontend. Nunca chegou a ser implementada — nenhum projeto Supabase foi
criado neste repositório.

</details>

Alternativa descartada: backend próprio em Node/Express fora do
ecossistema Cloudflare — mais controle, porém exigiria hospedagem e
deploy próprios sem benefício claro sobre Workers para este produto.

## 3. Hospedagem / deploy

Frontend estático (Vite build) e backend (Cloudflare Worker + D1) na
mesma conta Cloudflare. Nenhum servidor próprio para manter — deploy do
frontend é o build estático de sempre (qualquer host de arquivos
estáticos, incluindo Cloudflare Pages); deploy do backend é
`wrangler deploy` a partir de `worker/`. Passos manuais de configuração
inicial (criação do banco D1, domínio de e-mail) documentados em
`DEPLOYMENT.md`.

## 4. Estrutura de repositório

Monorepo com dois pacotes independentes — o frontend (raiz) e o Worker
(`worker/`), cada um com seu próprio `package.json`/`tsconfig.json` e
sua própria suíte de testes (`npx vitest run` na raiz roda só o
frontend; `npm test` dentro de `worker/` roda o backend):

```
fluxocid/
  docs/                 # documentação do produto
  src/
    app/                # bootstrap da aplicação, rotas, providers
    features/
      auth/              # login, cadastro, troca/recuperação de senha, sessão
      layouts/            # listagem/CRUD de layouts (projetos)
      editor/              # núcleo do editor 2D
        canvas/            # componentes de canvas (Konva)
        objects/           # catálogo de tipos de objeto + renderers
        state/             # store do editor (zustand), histórico
        properties-panel/  # painel de propriedades
        library-panel/     # biblioteca de objetos
        flow/               # prancheta de Fluxo (nós, conexões, canvas próprio)
    shared/
      ui/                 # componentes de design system reutilizáveis
      lib/                # utilitários (geometria, conversão de unidades)
      data/               # camada de repositório (local + remoto via Worker)
    types/                # tipos compartilhados (modelo de objetos etc.)
  worker/                # API Cloudflare Workers (Hono + D1) — pacote independente
    src/
      routes/             # handlers HTTP (auth, projects)
      db.ts               # queries D1
      crypto.ts            # hash de senha, tokens
      email.ts             # abstração de envio de e-mail
      session.ts           # cookies/sessão
    migrations/           # esquema D1 versionado
    test/                 # testes contra D1 real via Miniflare
```

Esta estrutura é referenciada em `ARCHITECTURE.md`.

## 5. Qualidade de código

- oxlint (frontend e Worker) + TypeScript em modo `strict` nos dois
  pacotes.
- Testes: Vitest no frontend (`npx vitest run`, raiz) e no Worker
  (`npm test` dentro de `worker/`, via `@cloudflare/vitest-pool-workers`
  contra um D1 real local).
- CI mínimo (GitHub Actions, quando chegarmos à Fase 10) rodando lint,
  typecheck e testes dos dois pacotes em cada push/PR.
