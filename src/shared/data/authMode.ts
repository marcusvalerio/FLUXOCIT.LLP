import { isRemoteApiConfigured } from './apiClient'

/**
 * O ARGUS.LLP roda em dois modos, e quem decide é a configuração do ambiente — nunca o código
 * da tela:
 *
 * - **Local** (`VITE_API_BASE_URL` ausente): sem conta, sem sessão, sem rede. Os projetos ficam
 *   no dispositivo (LocalLayoutRepository) e o app abre direto em `/projects`. É o modo em que a
 *   equipe usa o produto hoje, enquanto a infraestrutura remota não está provisionada.
 * - **Conta** (`VITE_API_BASE_URL` definido): autenticação própria da aplicação contra o Worker
 *   (Cloudflare Worker + D1), sessão por cookie HttpOnly e projetos por usuário. As rotas de
 *   `/login`, cadastro e recuperação de senha voltam ao fluxo, e `/projects` e `/editor/:id`
 *   passam a exigir sessão.
 *
 * A autorização de verdade é sempre do servidor (o Worker verifica sessão **e** dono do projeto
 * em toda rota) — este módulo só decide qual experiência o frontend apresenta.
 */
export function isAccountModeEnabled(): boolean {
  return isRemoteApiConfigured()
}
