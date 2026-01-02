# Leiritrix CRM

Sistema de gestão de vendas para parceiros Leiritrix.

## Funcionalidades

- Dashboard com métricas e estatísticas
- Gestão de vendas (criar, editar, visualizar)
- Gestão de parceiros
- Gestão de utilizadores (apenas Admin)
- Relatórios e exportação de dados
- Sistema de alertas de fidelização
- Autenticação segura com Supabase Auth
- Row Level Security (RLS) para proteção de dados

## Tecnologias

- Frontend: React 18, Vite, React Router, Tailwind CSS, shadcn/ui
- Backend: Supabase (PostgreSQL, Auth, RLS)
- Build: Vite (rápido e otimizado)

## Estrutura de Pastas

```
frontend/
├── src/
│   ├── components/     # Componentes UI (shadcn/ui)
│   ├── pages/          # Páginas da aplicação
│   ├── services/       # Serviços de integração Supabase
│   ├── lib/            # Configuração Supabase
│   └── hooks/          # Custom hooks
├── public/
└── package.json
```

## Como Executar

### Instalação

```bash
cd frontend
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O frontend executa em http://localhost:3000

### Build de Produção

```bash
npm run build
```

## Configuração Supabase

As variáveis de ambiente já estão configuradas no ficheiro `.env`:

- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave pública do Supabase

## Base de Dados

O sistema utiliza PostgreSQL através do Supabase com as seguintes tabelas:

- `users`: Utilizadores do sistema
- `partners`: Parceiros comerciais
- `sales`: Registos de vendas

Todas as tabelas têm Row Level Security (RLS) ativado para garantir segurança dos dados.

## Deploy no Vercel

### Passo 1: Push do Código para o Git

Certifique-se de que o código está num repositório Git (GitHub, GitLab ou Bitbucket).

### Passo 2: Importar Projeto no Vercel

1. Aceda a [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New..." → "Project"
3. Importe o seu repositório Git
4. Configure o projeto:
   - **Framework Preset:** Vite (será detetado automaticamente)
   - **Root Directory:** `.` (deixar como está)
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Output Directory:** `frontend/dist`

**NÃO CLIQUE EM DEPLOY AINDA!** Primeiro precisa configurar as variáveis de ambiente.

### Passo 3: Configurar Variáveis de Ambiente (CRÍTICO)

**Este passo é obrigatório para o sistema funcionar!**

Antes de fazer deploy, tem de adicionar as variáveis de ambiente do Supabase:

1. Na página de configuração do projeto no Vercel, encontre a secção **"Environment Variables"**
2. Adicione **exatamente** estas 2 variáveis (copie e cole):

**Variável 1:**
- Name: `VITE_SUPABASE_URL`
- Value: `https://kzvzjrgmqneqygwfihzw.supabase.co`
- Environment: Production, Preview, Development (selecione todas)

**Variável 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dnpqcmdtcW5lcXlnd2ZpaHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTQ5NjAsImV4cCI6MjA4MjkzMDk2MH0.jTpjTMRtI1mM9eNrKTnLXeVKWEtkUFji_h7HAJyp4HI`
- Environment: Production, Preview, Development (selecione todas)

**Nota:** Certifique-se de que os nomes das variáveis estão corretos, incluindo o prefixo `VITE_`.

### Passo 4: Deploy

Agora pode clicar em "Deploy" e aguardar a conclusão (demora 2-3 minutos).

### Passo 5: Verificar se Funcionou

Após o deploy:
1. Clique no link do projeto (ex: `https://seu-projeto.vercel.app`)
2. Deverá ver a página de login do Leiritrix CRM
3. Se vir uma página em branco ou erro, continue para a secção de resolução de problemas abaixo

---

## Resolução de Problemas

### Erro: "API Key Invalid" ao Fazer Login

**Causa Principal:** O URL do Vercel não está autorizado no Supabase (CORS).

**Solução Rápida:**

1. Aceda ao [Dashboard Supabase](https://supabase.com/dashboard) → Projeto `kzvzjrgmqneqygwfihzw`
2. Vá a **Authentication** → **URL Configuration**
3. Em **"Site URL"**, adicione: `https://seu-projeto.vercel.app`
4. Em **"Redirect URLs"**, adicione: `https://seu-projeto.vercel.app/**`
5. Clique em **Save** e aguarde 1-2 minutos
6. Teste novamente o login

**Se ainda não funcionar, consulte o guia completo:** [TROUBLESHOOTING_VERCEL.md](./TROUBLESHOOTING_VERCEL.md)

---

### Erro: Variáveis de Ambiente Não Carregadas

**Solução:**

1. Vá ao dashboard do Vercel → Selecione o seu projeto
2. Clique em **"Settings"** (menu superior)
3. No menu lateral, clique em **"Environment Variables"**
4. Verifique se as 2 variáveis estão listadas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Se **NÃO** estiverem: adicione-as agora usando os valores do Passo 3
6. Se **JÁ** estiverem: verifique se os valores estão corretos (copie novamente do Passo 3)
7. Após adicionar/corrigir as variáveis, vá ao separador **"Deployments"**
8. Clique nos 3 pontos (...) no último deployment
9. Clique em **"Redeploy"** → Marque **"Use existing Build Cache"** como **OFF**
10. Aguarde 2-3 minutos e teste novamente

### Erro: Página de Login Não Aparece (404 ou Página em Branco)

**Causa:** Problema com as rotas do React Router.

**Solução:**
- Verifique se o arquivo `vercel.json` existe na raiz do projeto
- O arquivo deve conter a configuração de rewrites
- Se alterou o `vercel.json`, faça um novo commit e push para acionar um redeploy automático

### Como Saber se as Variáveis Estão Carregadas

Abra o console do browser (F12) e verifique:
- Se vir "ERRO DE CONFIGURAÇÃO - Variáveis de ambiente Supabase não encontradas!" → As variáveis NÃO foram carregadas
- Solução: Siga os passos da secção "Erro: API Key Invalid" acima

---

## Notas Importantes

- O `vercel.json` está configurado para redirecionar todas as rotas para `/index.html` (necessário para o React Router funcionar)
- As variáveis de ambiente devem ser prefixadas com `VITE_` para o Vite as injetar no código frontend
- Após adicionar/modificar variáveis de ambiente, é **obrigatório** fazer redeploy
- Todos os pushes para a branch principal acionarão um deploy automático
- O primeiro deploy após configurar as variáveis pode demorar mais tempo

## Credenciais de Acesso

**Administrador:**
- Email: admin@leiritrix.com
- Password: Admin123!@#

Este utilizador tem acesso total ao sistema incluindo gestão de utilizadores e parceiros.
