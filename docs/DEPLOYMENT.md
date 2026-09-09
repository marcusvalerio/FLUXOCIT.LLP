# FluxoCit — Deploy

> **Versão atual (Fase 10): o frontend é publicável sozinho.** Os
> projetos ficam no dispositivo (`localStorage`), sem conta e sem
> backend. Para publicar no Vercel a partir do GitHub basta o próprio
> repositório: `vercel.json` já traz `buildCommand` (`npm run build`),
> `outputDirectory` (`dist`) e o fallback SPA (toda rota serve
> `index.html`, necessário para abrir/recarregar `/projects` e
> `/editor/:layoutId` direto na URL). **Não** defina `VITE_API_BASE_URL`
> — sem ela o frontend nunca chama API alguma. Nada abaixo é necessário
> nesta versão.

## Backend (Fase 9) — apenas para a futura versão multiusuário

> Este documento lista os passos **manuais**, numa conta Cloudflare (e
> numa conta Resend) reais, necessários para colocar o backend em
> produção. Nada aqui foi executado neste repositório — não há conta
> Cloudflare, banco D1 remoto nem domínio de e-mail configurados. Todo o
> código e a configuração que **podem** existir sem essas contas já
> estão prontos (`worker/`, migrations, `wrangler.toml` com placeholders
> claramente marcados). Em desenvolvimento local, nada disto é
> necessário — ver § 5.

## 0. Pré-requisitos

- Uma conta Cloudflare (gratuita serve para começar).
- Node.js instalado localmente para rodar `npx wrangler`.
- Login do Wrangler na conta: `npx wrangler login` (abre o navegador
  para autorizar) — feito uma vez por máquina, dentro de `worker/`.
- Opcional, só necessário para envio real de e-mail (§ 4): uma conta em
  [resend.com](https://resend.com) e um domínio que você controle, para
  verificar como remetente.

## 1. Banco de dados (Cloudflare D1)

```bash
cd worker
npx wrangler d1 create fluxocit-db
```

O comando imprime um `database_id`. Copie-o para
`worker/wrangler.toml`, substituindo o placeholder:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fluxocit-db"
database_id = "REPLACE_WITH_D1_DATABASE_ID"   # <- cole o ID real aqui
migrations_dir = "migrations"
```

`database_id` **não é um segredo** (é só um identificador do recurso),
então pode ficar versionado no `wrangler.toml` normalmente.

Em seguida, aplique o esquema (`worker/migrations/`) ao banco remoto
recém-criado:

```bash
npm run db:migrate:remote
# equivalente a: wrangler d1 migrations apply fluxocit-db --remote
```

Rode esse mesmo comando de novo sempre que uma nova migration for
adicionada em `worker/migrations/` (elas são numeradas e aplicadas em
ordem, sem reaplicar as já feitas).

## 2. Publicar o Worker

```bash
cd worker
npx wrangler deploy
```

Isso publica a API em uma URL do tipo
`https://fluxocit-api.<seu-subdomínio-workers>.workers.dev` (o
subdomínio é definido pela sua conta Cloudflare no primeiro deploy de
qualquer Worker). Anote essa URL — ela é usada em dois lugares:

1. **`worker/wrangler.toml` → `[vars] FRONTEND_ORIGIN`** — deve ser a
   URL do frontend publicado (não `localhost`), para o CORS e os
   cookies de sessão funcionarem em produção. Ajuste antes do deploy:
   ```toml
   [vars]
   FRONTEND_ORIGIN = "https://SEU-DOMINIO-DO-FRONTEND"
   ```
2. **Build do frontend → `VITE_API_BASE_URL`** — configure essa
   variável de ambiente na plataforma onde o frontend é hospedado (ex.:
   Cloudflare Pages, Vercel, Netlify) apontando para a URL do Worker do
   passo anterior. Localmente isso é feito em `.env.local`
   (`.env.example` documenta o formato).

Um domínio custom para o Worker é opcional (configurável depois, via
Cloudflare Dashboard → Workers → seu Worker → Triggers → Custom Domains)
— não é necessário para o app funcionar.

## 3. Sessão via cookie — nada a configurar manualmente

O cookie de sessão já é `HttpOnly` sempre, e `Secure` automaticamente
quando a requisição chega via HTTPS (`worker/src/session.ts`) — tanto
`*.workers.dev` quanto qualquer domínio custom do Cloudflare servem
HTTPS por padrão, então nenhuma configuração extra é necessária aqui. O
único cuidado é manter `FRONTEND_ORIGIN` (passo 2) correto: um valor
errado faz o navegador recusar o cookie por `SameSite`/CORS, não um
problema de segurança, mas de configuração.

## 4. E-mail transacional (Resend)

Sem isto configurado, o Worker **não falha** — ele cai automaticamente
para o `ConsoleEmailSender`, que só loga o conteúdo do e-mail nos logs
do Worker (`wrangler tail` em produção, terminal do `wrangler dev` em
local) em vez de entregar de verdade. Ou seja: **cadastro e recuperação
de senha continuam funcionando tecnicamente sem Resend, mas o usuário
nunca recebe a senha temporária por e-mail** — configure isto antes de
liberar o cadastro para usuários reais.

Passos:

1. Crie uma conta em [resend.com](https://resend.com).
2. Adicione e verifique um domínio que você controle (Resend pede para
   adicionar registros DNS — SPF/DKIM — no seu provedor de domínio;
   isso é inerente a qualquer envio de e-mail transacional confiável e
   não tem como ser automatizado a partir deste repositório).
3. Gere uma API key no painel da Resend.
4. Configure o secret no Worker (nunca no `wrangler.toml`, nunca no
   frontend):
   ```bash
   cd worker
   npx wrangler secret put RESEND_API_KEY
   # cola a API key quando solicitado
   ```
5. Ajuste o remetente em `worker/wrangler.toml` para um endereço do seu
   domínio verificado:
   ```toml
   [vars]
   EMAIL_FROM_NAME = "FluxoCit"
   EMAIL_FROM_ADDRESS = "no-reply@SEU-DOMINIO-VERIFICADO"
   ```
6. Publique de novo (`npx wrangler deploy`) para os `[vars]` atualizados
   entrarem em vigor.

**Por que Resend e não o binding nativo `send_email` dos Workers:**
esse binding entrega apenas para um endereço de destino fixo,
pré-verificado no dashboard — ele não serve para enviar a um endereço
que o usuário acabou de digitar no cadastro. Resend (ou qualquer
provedor HTTP equivalente) é a opção correta para e-mail transacional
com destino arbitrário; a interface `EmailSender`
(`worker/src/email.ts`) mantém o provedor trocável sem tocar no resto
do código caso outro seja preferido no futuro.

## 5. Desenvolvimento local — nenhuma conta necessária

```bash
cd worker
npm install
npx wrangler dev --local     # D1 local (SQLite em disco), porta 8787
```

Isso roda o Worker inteiramente offline: o D1 local não precisa do
`database_id` real preenchido (o placeholder funciona para dev local),
e o envio de e-mail cai no `ConsoleEmailSender` — a senha temporária de
cadastro aparece no terminal do `wrangler dev`. Aplique as migrations
localmente uma vez com `npm run db:migrate:local`. No frontend, aponte
`VITE_API_BASE_URL=http://localhost:8787` (já é o padrão em
`.env.example`).

## 6. Checklist de produção

- [ ] `wrangler d1 create fluxocit-db` executado, `database_id` colado
      em `worker/wrangler.toml`.
- [ ] `npm run db:migrate:remote` executado (schema aplicado ao D1 remoto).
- [ ] `FRONTEND_ORIGIN` em `worker/wrangler.toml` apontando para o
      domínio real do frontend publicado.
- [ ] `npx wrangler deploy` executado a partir de `worker/`.
- [ ] `VITE_API_BASE_URL` configurado no build do frontend, apontando
      para a URL do Worker publicado.
- [ ] Conta Resend criada, domínio de envio verificado, `RESEND_API_KEY`
      configurado via `wrangler secret put` (nunca em `.env`/código).
- [ ] `EMAIL_FROM_ADDRESS` em `worker/wrangler.toml` usando o domínio
      verificado na Resend.

Nenhum destes passos foi executado neste repositório — os placeholders
em `worker/wrangler.toml` (`REPLACE_WITH_D1_DATABASE_ID`,
`no-reply@fluxocit.example`) permanecem exatamente para deixar isso
visível em vez de simular uma configuração que não existe.
