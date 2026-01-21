# Validação de Emails

## Implementação

O sistema agora possui validação robusta de emails que segue as regras universais:

### Regras Aplicadas

1. **Case-insensitive**: Emails são convertidos automaticamente para minúsculas
   - `TESTE@EXEMPLO.PT` → `teste@exemplo.pt`
   - `TeSte@ExeMpLo.PT` → `teste@exemplo.pt`

2. **Sem acentos**: Caracteres acentuados são removidos automaticamente
   - `josé@exemplo.pt` → `jose@exemplo.pt`
   - `joão@exemplo.pt` → `joao@exemplo.pt`

3. **Sem espaços**: Espaços são removidos automaticamente
   - `teste @exemplo.pt` → `teste@exemplo.pt`
   - `teste@ exemplo.pt` → `teste@exemplo.pt`

4. **Formato válido**: Validação de formato de email padrão
   - Deve conter `@` e domínio válido
   - Não permite pontos consecutivos (`..`)
   - Não permite pontos no início ou adjacentes ao `@`

### Exemplos de Validação

#### Emails Válidos (após normalização)
- `usuario@exemplo.pt` ✓
- `USUARIO@EXEMPLO.PT` ✓ (normalizado para minúsculas)
- `Usuário@Exemplo.pt` ✓ (acento removido, minúsculas aplicadas)
- `user.name@exemplo.pt` ✓
- `user_name@exemplo.pt` ✓
- `user-name@exemplo.pt` ✓

#### Emails Inválidos
- `usuario` ✗ (sem domínio)
- `usuario@` ✗ (domínio incompleto)
- `@exemplo.pt` ✗ (sem nome de utilizador)
- `usuario..name@exemplo.pt` ✗ (pontos consecutivos)
- `.usuario@exemplo.pt` ✗ (começa com ponto)

## Onde a Validação é Aplicada

1. **Login** (`authService.signIn`)
   - Email normalizado antes do login
   - Validação de formato

2. **Registo de Utilizadores** (`authService.signUp`)
   - Email normalizado e validado
   - Feedback de erro específico se inválido

3. **Edição de Utilizadores** (`Users.jsx`)
   - Validação antes de salvar
   - Mensagens de erro específicas

4. **Base de Dados**
   - Trigger que garante normalização automática
   - Previne inconsistências futuras

## Mensagens de Erro

O sistema fornece mensagens de erro específicas:

- **Email com acentos**: "Email não pode conter acentos ou caracteres especiais"
- **Email com espaços**: "Email não pode conter espaços"
- **Email inválido**: "Email inválido"
- **Email vazio**: "Email é obrigatório"

## Benefícios

1. **Consistência**: Todos os emails são armazenados no mesmo formato
2. **Prevenção de erros**: Evita problemas de login por case mismatch
3. **Experiência do utilizador**: Aceita inputs em vários formatos
4. **Segurança**: Validação rigorosa previne dados inválidos
5. **Manutenção**: Centralizada em um único módulo (`emailValidator.js`)
