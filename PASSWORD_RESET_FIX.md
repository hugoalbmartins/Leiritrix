# Correção do Reset de Password

## Problemas Identificados

### Problema 1: Admin API no Frontend (403 Forbidden)
O sistema estava tentando usar a Admin API do Supabase (`supabase.auth.admin.updateUserById`) diretamente no frontend, o que resultava em erro 403 porque:

1. A Admin API requer privilégios elevados
2. Não pode ser chamada diretamente do frontend por questões de segurança
3. O erro era: "User not allowed" / "not_admin"

### Problema 2: Validação de Token com Service Role (401 Unauthorized)
A Edge Function estava usando SERVICE_ROLE_KEY para validar o token do utilizador, causando erro 401 porque:

1. O token JWT do utilizador é criado com ANON_KEY
2. SERVICE_ROLE_KEY não pode validar tokens criados com ANON_KEY
3. É necessário usar ANON_KEY para validação e SERVICE_ROLE_KEY apenas para operações privilegiadas

## Solução Implementada

### 1. Edge Function Criada: `reset-password`

Criada uma Edge Function segura que usa **dois clientes Supabase**:

**Cliente de Autenticação (ANON_KEY)**:
- Valida o token JWT do utilizador autenticado
- Verifica se o utilizador tem role "admin"
- Garante que apenas admins podem chamar a função

**Cliente Admin (SERVICE_ROLE_KEY)**:
- Executa operações privilegiadas
- Reseta a password do utilizador target
- Define `must_change_password: true` no perfil

**Localização**: `/supabase/functions/reset-password/index.ts`

### 2. Atualização do Frontend

Atualizado `usersService.resetUserPassword()` para:
- Chamar a Edge Function em vez da Admin API
- Enviar token de autenticação no header
- Tratar erros apropriadamente

**Localização**: `/frontend/src/services/usersService.js`

## Como Funciona Agora

1. **Admin clica em "Resetar Password"** na interface de utilizadores
2. **Frontend chama** `usersService.resetUserPassword(userId, newPassword)`
3. **Pedido vai para** Edge Function: `POST /functions/v1/reset-password`
4. **Edge Function valida com Cliente ANON_KEY**:
   - Token de autenticação do utilizador
   - Role do utilizador (deve ser "admin")
5. **Edge Function executa com Cliente SERVICE_ROLE_KEY**:
   - Reset da password via Admin API
   - Update do campo `must_change_password: true`
6. **Resposta retorna** para o frontend com sucesso/erro

**Separação de Responsabilidades**:
- ANON_KEY: Autenticação e autorização
- SERVICE_ROLE_KEY: Operações privilegiadas

## Segurança

- Apenas utilizadores com role "admin" podem resetar passwords
- Service Role Key nunca é exposta ao frontend
- Todas as operações são logadas no servidor
- Token JWT é validado em cada pedido

## Validação de Email no Login

O login agora:
- Aceita emails em qualquer formato (maiúsculas, minúsculas, misto)
- Normaliza automaticamente para minúsculas
- Remove acentos e espaços
- Valida formato antes de tentar autenticar

**Exemplo**: `TESTE@EXEMPLO.PT`, `Teste@Exemplo.pt` e `teste@exemplo.pt` são todos aceites e tratados como o mesmo email.

## Teste

Para testar o reset de password:

1. Faça login como admin
2. Vá para a página "Utilizadores"
3. Clique no botão de reset (ícone de refresh) ao lado de qualquer utilizador
4. Confirme a ação
5. A password será resetada e o utilizador será obrigado a alterá-la no próximo login

## Notas Técnicas

- Edge Function deployada com `verify_jwt: true` (requer autenticação)
- CORS configurado para aceitar pedidos do frontend
- Usa **dois clientes Supabase** para separar responsabilidades:
  - Cliente ANON_KEY: validação de autenticação
  - Cliente SERVICE_ROLE_KEY: operações privilegiadas
- Compatível com políticas RLS do Supabase

## Histórico de Correções

### v1 (Inicial)
- Erro 403: Tentativa de usar Admin API no frontend

### v2 (Correção 401)
- Correção: Separação de clientes ANON_KEY e SERVICE_ROLE_KEY
- ANON_KEY valida o token JWT do utilizador
- SERVICE_ROLE_KEY executa operações Admin
- Problema resolvido: erro 401 Unauthorized eliminado
