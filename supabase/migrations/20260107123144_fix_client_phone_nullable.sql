/*
  # Tornar client_phone opcional na tabela sales

  1. Alterações
    - Alterar coluna `client_phone` em `sales` para permitir NULL
    - Isto permite que o utilizador preencha apenas email ou apenas telefone ao registar uma venda
  
  2. Justificação
    - A lógica de negócio requer pelo menos um contacto (email OU telefone)
    - O campo era NOT NULL mas deve ser nullable para suportar esta lógica
*/

-- Tornar client_phone nullable
ALTER TABLE sales ALTER COLUMN client_phone DROP NOT NULL;
