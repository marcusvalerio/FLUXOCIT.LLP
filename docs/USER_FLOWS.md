# FluxoCit — Fluxos de Usuário

## 0. Entrada (versão atual — Fase 10, sem conta)

1. Usuário abre o FluxoCit → cai direto em `/projects` (lista de
   projetos deste dispositivo). Não há login, cadastro nem sessão.
2. "Novo projeto" → nome, descrição e dimensões do ambiente → o projeto
   é criado localmente e o editor abre em `/editor/:layoutId`.
3. Edita Layout e Fluxo → autosave local → "Voltar" → o projeto continua
   na lista, com os dados preservados entre recarregamentos do
   navegador.
4. Os projetos ficam no `localStorage` deste navegador/dispositivo: não
   são compartilhados entre máquinas nem entre usuários (é o que a
   seção 1 passa a resolver quando a versão multiusuário for retomada).

## 1. Cadastro e login (Fase 9 — fora do fluxo na versão atual)

1. Usuário acessa o FluxoCit sem sessão ativa → pode navegar como
   visitante (persistência local) ou ir para a tela de login.
2. Usuário sem conta escolhe "Criar conta" → informa apenas o e-mail →
   conta criada com uma **senha temporária gerada pelo sistema**,
   enviada por e-mail (nunca exibida na tela) → usuário é levado ao
   login.
3. Usuário informa e-mail + senha temporária recebida por e-mail →
   sessão iniciada → **redirecionado obrigatoriamente para a troca de
   senha** antes de acessar qualquer outra tela (não é possível pular).
4. Após definir a nova senha → redireciona para a lista de projetos.
5. Em acessos seguintes, usuário com conta já definida informa e-mail e
   senha → sessão iniciada → redireciona direto para a lista de projetos.
6. "Esqueci minha senha" → usuário informa e-mail → se existir conta,
   recebe um link/token de redefinição de uso único por e-mail (nunca
   confirma nem nega a existência da conta na tela, para não vazar quais
   e-mails estão cadastrados).
7. Falha de autenticação → mensagem de erro clara, sem expor detalhes
   sensíveis (ex.: não diferenciar "usuário não existe" de "senha
   errada").
8. Se o usuário tinha projetos salvos localmente (visitante) antes de
   criar conta, a lista de projetos oferece migrá-los para a conta —
   nunca automático, nunca sobrescreve um projeto remoto existente (ver
   `docs/ARCHITECTURE.md` § 2.4).

## 2. Lista de layouts (dashboard)

1. Usuário autenticado vê a lista dos próprios projetos (Layout + Fluxo).
2. Lista vazia → estado vazio com call-to-action "Criar novo layout".
3. Usuário pode: criar novo layout, abrir layout existente, renomear,
   excluir (com confirmação), duplicar (pós-MVP).
4. Cada item da lista mostra: nome, miniatura/preview (quando
   disponível), data da última edição.

## 3. Criar novo layout

1. Usuário toca em "Criar novo layout".
2. Sistema solicita nome do layout (obrigatório) e, opcionalmente,
   dimensões iniciais do espaço (ou usa padrão editável depois).
3. Sistema cria o layout vazio e abre o editor imediatamente.

## 4. Editar layout — fluxo central

1. Usuário abre um layout → editor 2D carrega o canvas com os objetos
   existentes (ou canvas vazio se novo).
2. Usuário abre a biblioteca de objetos (painel lateral no desktop,
   painel inferior retrátil no mobile).
3. Usuário seleciona uma categoria (ex.: Armazenagem) e um tipo de
   objeto (ex.: Porta-paletes).
4. Usuário insere o objeto no canvas:
   - Desktop: arrasta da biblioteca para o canvas.
   - Mobile/touch: toca no objeto da biblioteca → objeto aparece no
     centro da área visível do canvas, já selecionado, pronto para
     posicionar.
5. Objeto inserido fica automaticamente selecionado; painel de
   propriedades é exibido.
6. Usuário ajusta o objeto:
   - Arrasta para mover (com snapping ativo por padrão).
   - Usa alça de rotação ou campo numérico de ângulo.
   - Ajusta dimensões via painel de propriedades (quando aplicável).
   - Edita nome/identificação (opcional).
7. Usuário pode duplicar o objeto selecionado (botão de ação rápida ou
   atalho) → cópia aparece deslocada, já selecionada.
8. Usuário pode excluir o objeto selecionado (botão de ação rápida,
   atalho, ou gesto).
9. Usuário navega pelo canvas: zoom (pinça/roda do mouse/botões +/-) e
   pan (arrastar fundo vazio/dois dedos).
10. Usuário pode desfazer/refazer ações a qualquer momento.
11. Alterações são salvas automaticamente; usuário pode também salvar
    manualmente.
12. Usuário sai do editor (navega para a lista) → progresso preservado.

## 5. Selecionar e editar múltiplos objetos (P1)

1. Usuário desenha um retângulo de seleção sobre uma área do canvas (ou
   usa shift+clique por objeto).
2. Objetos dentro da área ficam selecionados; painel de propriedades
   mostra apenas campos comuns (ex.: rotação relativa, exclusão em
   lote).
3. Usuário pode mover, duplicar ou excluir a seleção como um grupo.

## 6. Reabrir layout existente

1. Usuário volta à lista de layouts (mesma sessão ou nova sessão, outro
   dispositivo).
2. Usuário abre um layout salvo anteriormente.
3. Editor carrega exatamente o último estado salvo: todos os objetos,
   posições, dimensões, rotações e propriedades.
4. Usuário continua editando normalmente.

## 7. Estados de erro e feedback

- Falha ao salvar: indicador visível (ex.: badge "não salvo" /
  "salvando..." / "salvo") no editor; se falhar, alerta explícito com
  opção de tentar novamente.
- Perda de conexão (quando aplicável a persistência em nuvem): edição
  local continua funcionando; sincroniza ao reconectar.
- Ação inválida (ex.: excluir objeto já removido por outra sessão):
  mensagem clara, estado da UI se recompõe com os dados atuais.

## 8. Fluxo mobile — considerações específicas

1. Biblioteca de objetos abre como painel inferior (bottom sheet)
   retrátil, para não ocupar a tela toda permanentemente.
2. Painel de propriedades abre como painel inferior ou lateral
   deslizante ao selecionar um objeto, com botão claro de fechar.
3. Zoom por pinça e pan por arraste de um dedo no canvas não devem
   conflitar com o scroll da página — o canvas captura o gesto quando o
   toque começa dentro da área de trabalho.
4. Controles críticos (inserir, duplicar, excluir, desfazer, refazer)
   ficam acessíveis em uma barra de ações fixa, com alvos de toque
   grandes.
5. Rotação em touch é feita preferencialmente por controle simples
   (botões "girar 90°" / "girar -90°" e alça de rotação para ajuste
   fino), evitando depender de gestos complexos de dois dedos para
   rotação exata.
