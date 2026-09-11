-- ARGUS.LLP — compartilhamento de projetos.
--
-- `project_members` é a única fonte de verdade para "quem pode acessar este projeto e com que
-- papel" — inclusive o próprio dono, que ganha uma linha role='owner' no momento da criação
-- (ver db.ts createProject). Toda autorização de leitura/escrita passa por esta tabela; a coluna
-- `projects.user_id` continua existindo só para o registro histórico de quem criou o projeto,
-- nunca é consultada para decidir acesso a partir desta migração.
--
-- Sem `ON DELETE CASCADE` para user_id → se um usuário for removido, sua permissão de acesso
-- desaparece com ele mas o projeto (e o registro de quem mais tem acesso) permanece intacto.
CREATE TABLE project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Backfill: todo projeto já existente ganha seu dono como membro 'owner', para que a listagem e
-- as checagens de acesso (agora baseadas só em project_members) continuem enxergando os projetos
-- criados antes desta fase.
INSERT INTO project_members (project_id, user_id, role, created_at)
SELECT id, user_id, 'owner', created_at FROM projects;
