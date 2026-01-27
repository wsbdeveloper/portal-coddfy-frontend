Frontend PRD — Tela de Gerenciamento (Admin Global)
1. Objetivo
Disponibilizar uma única tela onde o Admin Global consegue supervisionar e administrar usuários, parceiros e clientes de forma segura, respeitando o escopo multi-tenant do backend.
2. Público-alvo
Usuário com role = ADMIN_GLOBAL.
Não expor opções de criação/edição para parceiros/clientes quando o usuário não for Admin Global.
3. Componentes principais
3.1 Header
Logo + nome do produto (CCM).
Avatar/nome do admin logado e botão “Sair”.
Breadcrumb ou título “Gerenciamento”.
3.2 Painel de usuários
Lista paginada com colunas: Nome, Email, Papel, Parceiro (se houver), Status.
Filtros: role (dropdown), parceiro (dropdown), status.
Busca por nome/email.
Ações:
Botão “+ Novo Usuário” (abre modal/formulário):
Campos: username, email, senha, role (select com enum).
Validações inline (senha mínima, email válido).
Permite escolher parceiro (opcional para global).
Botões de editar/excluir por linha (ativam modal confirmando variações).
Estado “Sem resultados” com CTA para criar usuário.
3.3 Painel de parceiros
Lista de parceiros com colunas: Nome, Estratégico (bool), Status, #Clientes, #Consultores.
Ações:
“+ Novo Parceiro” → modal/form com: nome, estratégico (checkbox), status (string ou select).
Editar status/estratégico inline ou via modal.
Detalhes/expand para mostrar clientes vinculados.
3.4 Painel de clientes
Lista com colunas: Nome, CNPJ, Razão Social, Parceiro, Contratos ativos.
Filtros por parceiro.
Modal “+ Novo Cliente” (nome, cnpj, razão social). Parceiro obrigatório? (auto atrelado ao selected).
3.5 Informações auxiliares
Card com métricas rápidas (total de usuários, parceiros ativos, clientes sem contratos, etc.) usando dados já disponíveis (dashboard).
Timeline/Log simples com últimas ações (opcional).
4. Regras de acesso
Toda modificação (criação, atualização, exclusão) só aparece para Admin Global.
Para usuários não-global, esconder completamente essa tela do menu.
Chamadas à API usam require_admin_global; se receber 403 mostrar toast e redirecionar.
5. Integrações com backend
GET /api/auth/users (if exists)? se não, usar endpoints existentes (ou mesmo register para criar).
POST /api/auth/register para novos usuários (já protegido).
GET /api/partners, POST/PUT/DELETE /api/partners/{id}.
GET /api/clients, POST/PUT/DELETE /api/clients/{id}.
Aproveitar filtros de parceiros implementados no backend.
6. UX/UI
Layout em cards modulados para cada recurso.
Feedback visual (modals/toasts) para operações bem-sucedidas ou falhas de permissão.
Validação clara quando backend retornar 403 (mostrar “Você precisa ser Admin Global”).
7. Balanceamento mobile/desktop
Priorizar desktop (admin view), mas manter responsividade básica.
Colapsar tabelas em cards em telas menores.


Contratos

Segue o contrato de entrada (request payloads) para as APIs da tela de gerenciamento que o Admin Global vai usar.
POST /api/auth/register (somente Admin Global)
  {    "username": "string",    "email": "string",    "password": "string",    "role": "admin_global | admin_partner | user_partner",    "partner_id": "uuid" // opcional, só para roles vinculados a parceiro  }
POST /api/partners
  {    "name": "string",    "is_strategic": true | false,      // opcional    "status": "string",                // opcional    "is_active": true | false          // opcional  }
PUT /api/partners/{id}
  {    "name": "string",                  // opcional    "is_strategic": true | false,      // opcional    "status": "string",                // opcional    "is_active": true | false          // opcional  }
POST /api/clients
  {    "name": "string",    "cnpj": "string",                  // opcional    "razao_social": "string",          // opcional    "partner_id": "uuid"               // obrigatório (Admin Global escolhe)  }
PUT /api/clients/{id}
  {    "name": "string",                  // opcional    "cnpj": "string",                  // opcional    "razao_social": "string"           // opcional  }
DELETE /api/clients/{id} — sem payload (os dados são passados pela rota).