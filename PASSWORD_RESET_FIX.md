# Correção do Reset de Password

## Problema Identificado

O sistema estava tentando usar a Admin API do Supabase (`supabase.auth.admin.updateUserById`) diretamente no frontend, o que resultava em erro 403 (Forbidden) porque:

1. A Admin API requer privilégios elevados
2. Não pode ser chamada diretamente do frontend por questões de segurança
3. O erro era: "User not allowed" / "not_admin"

## Solução Implementada

### 1. Edge Function Criada: `reset-password`

Criada uma Edge Function segura que:
- Executa no servidor (backend)
- Tem acesso à Service Role Key (privilégios de admin)
- Valida autenticação do utilizador que faz o pedido
- Verifica se o utilizador tem role "admin"
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
4. **Edge Function valida**:
   - Token de autenticação
   - Role do utilizador (deve ser "admin")
5. **Edge Function executa**:
   - Reset da password via Admin API (com Service Role Key)
   - Update do campo `must_change_password: true`
6. **Resposta retorna** para o frontend com sucesso/erro

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
- Usa Service Role Key para operações privilegiadas
- Compatível com políticas RLS do Supabase
