# Guia de Resolução: Erro "API Key Invalid" no Vercel

## Diagnóstico Verificado

✅ **Usuário admin existe** na base de dados
✅ **Código está correto** e funciona localmente
✅ **Chaves Supabase são válidas**

O problema está relacionado com a configuração do Vercel ou CORS do Supabase.

---

## Solução 1: Verificar e Adicionar URL do Vercel no Supabase (MAIS COMUM)

O Supabase precisa autorizar o domínio do Vercel para aceitar pedidos do seu site.

### Passo a Passo:

1. **Aceda ao Dashboard do Supabase:**
   - Vá a [supabase.com](https://supabase.com/dashboard)
   - Faça login e selecione o projeto: `kzvzjrgmqneqygwfihzw`

2. **Configure os URLs Permitidos:**
   - No menu lateral, clique em **"Authentication"** (ícone de chave)
   - Clique em **"URL Configuration"**
   - Encontre o campo **"Site URL"** e adicione o URL do seu projeto Vercel:
     ```
     https://seu-projeto.vercel.app
     ```
     (Substitua pelo URL real do seu projeto)

3. **Configure Redirect URLs Adicionais:**
   - No campo **"Redirect URLs"**, adicione:
     ```
     https://seu-projeto.vercel.app/**
     https://seu-projeto.vercel.app/dashboard
     ```

4. **Guarde as Alterações:**
   - Clique em **"Save"** no fundo da página
   - Aguarde 1-2 minutos para as alterações serem aplicadas

5. **Teste Novamente:**
   - Vá ao seu site no Vercel
   - Tente fazer login com: `admin@leiritrix.com` / `Admin123!@#`

---

## Solução 2: Verificar se as Variáveis Foram Aplicadas no Vercel

### Como Verificar:

1. **No Dashboard do Vercel:**
   - Vá a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecione o seu projeto
   - Clique em **"Settings"** → **"Environment Variables"**

2. **Confirme que estas 2 variáveis existem:**
   - ✅ `VITE_SUPABASE_URL` = `https://kzvzjrgmqneqygwfihzw.supabase.co`
   - ✅ `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Se NÃO existirem ou estiverem erradas:**
   - Adicione/corrija as variáveis
   - Vá a **"Deployments"**
   - No último deployment, clique nos 3 pontos **(...)**
   - Clique em **"Redeploy"** → Marque a opção **"Use existing Build Cache"** como **OFF**
   - Confirme **"Redeploy"**

### Verificar no Browser:

Após o redeploy, abra o site e pressione **F12** para abrir o console:

- ✅ **BOM:** Sem mensagens de erro sobre variáveis
- ❌ **MAU:** "ERRO DE CONFIGURAÇÃO - Variáveis de ambiente Supabase não encontradas!"

Se vir a mensagem de erro, as variáveis NÃO foram carregadas corretamente. Repita o passo de redeploy.

---

## Solução 3: Usar Página de Teste de Diagnóstico

Foi criado um arquivo de teste que pode ajudar a diagnosticar o problema:

1. **Aceda ao arquivo de teste:**
   - No seu projeto Vercel, aceda a: `https://seu-projeto.vercel.app/test-supabase.html`
   - Ou abra localmente: `frontend/test-supabase.html` no browser

2. **Execute os testes:**
   - Clique em **"Testar Conexão"** → Verifica se o Supabase está acessível
   - Clique em **"Testar Login"** → Tenta fazer login com as credenciais admin

3. **Interprete os resultados:**
   - ✅ **Verde (Sucesso):** Tudo funciona
   - ❌ **Vermelho (Erro):** Há um problema - leia a mensagem de erro detalhada

4. **Mensagens de erro comuns:**
   - `Invalid API key` → Vá para a Solução 1 (configurar CORS no Supabase)
   - `Failed to fetch` → Problema de rede ou CORS
   - `Invalid login credentials` → Password incorreta (use `Admin123!@#`)

---

## Solução 4: Verificar Logs de Erro Detalhados

1. **No Vercel:**
   - Vá ao seu projeto → **"Deployments"**
   - Clique no último deployment
   - Vá ao separador **"Functions"** ou **"Runtime Logs"**
   - Procure por erros relacionados com Supabase

2. **No Browser (seu site):**
   - Abra o site
   - Pressione **F12** → **"Console"**
   - Tente fazer login
   - Copie a mensagem de erro completa
   - Verifique também o separador **"Network"** → Procure por pedidos falhados (a vermelho)

3. **Erros Comuns:**

   **Erro:** `Failed to fetch` ou `Network error`
   - **Causa:** CORS não configurado (volte à Solução 1)

   **Erro:** `Invalid API key`
   - **Causa:** Chave incorreta ou variáveis não carregadas (Solução 2)

   **Erro:** `Invalid login credentials`
   - **Causa:** Password incorreta (use `Admin123!@#`)

---

## Solução 5: Testar Localmente Primeiro

Antes de continuar troubleshooting no Vercel, confirme que funciona localmente:

```bash
cd frontend
npm install
npm run dev
```

Aceda a `http://localhost:5173` e tente fazer login.

- ✅ **Funciona localmente?** → O problema é específico do Vercel (Soluções 1 ou 2)
- ❌ **NÃO funciona localmente?** → Problema com as credenciais ou base de dados

---

## Solução 6: Limpar Cache e Forçar Build Completo

Às vezes o Vercel usa cache antigo:

1. Vá a **"Settings"** → **"General"**
2. Role até ao fundo
3. Clique em **"Clear Build Cache"**
4. Vá a **"Deployments"**
5. Faça **"Redeploy"** (SEM usar cache)

---

## Solução 7: Verificar Status do Projeto Supabase

1. Aceda ao [Dashboard Supabase](https://supabase.com/dashboard)
2. Verifique se o projeto está **"Active"** (verde)
3. Se estiver **"Paused"** ou **"Inactive"** → Clique em **"Restore"** ou **"Resume"**

---

## Checklist Final

Antes de contactar suporte, confirme:

- [ ] Variáveis de ambiente existem no Vercel com os valores corretos
- [ ] Fez redeploy APÓS adicionar as variáveis
- [ ] URL do Vercel está na lista de URLs permitidos no Supabase
- [ ] Projeto Supabase está ativo (não pausado)
- [ ] Login funciona localmente (`npm run dev`)
- [ ] Console do browser (F12) não mostra erro de configuração

---

## Precisa de Ajuda?

Se seguiu TODOS os passos acima e ainda tem o erro:

1. **Tire screenshots de:**
   - Variáveis de ambiente no Vercel
   - URL Configuration no Supabase (Authentication → URL Configuration)
   - Console do browser (F12) com o erro ao tentar fazer login
   - Network tab (F12 → Network) mostrando o pedido falhado

2. **Anote:**
   - URL do seu projeto Vercel: `https://_____.vercel.app`
   - Mensagem de erro exata que aparece

3. **Informações úteis:**
   - Email: `admin@leiritrix.com`
   - Password: `Admin123!@#`
   - Supabase URL: `https://kzvzjrgmqneqygwfihzw.supabase.co`

---

## Notas Importantes

⚠️ **NUNCA** adicione as variáveis diretamente no código
⚠️ **SEMPRE** faça redeploy após mudar variáveis de ambiente
⚠️ **CERTIFIQUE-SE** de que marcou todos os ambientes (Production, Preview, Development) ao adicionar variáveis
⚠️ O prefixo `VITE_` é **obrigatório** para o Vite injetar as variáveis no frontend
