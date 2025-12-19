# CRM Leiritrix - Requirements & Architecture

## Problem Statement Original
Construir CRM interno para registo de vendas. Somos uma empresa de revenda de serviços e precisamos registar as vendas que enviamos para os nossos parceiros com possibilidade de atribuição por admin das comissões aplicadas a cada contrato. Deve haver BO que gere também o registo e estado das vendas. São vendas de energias, telecomunicações e painéis solares. Energias e telecomunicações podem ser novas instalações ou refids, e devem alertar 7 meses antes do fim de fidelização para entrada em negociação. No registo de venda é colocado o prazo de fidelização, que contabiliza a partir da data de estado ativo.

## User Choices
- **Roles**: Admin, Backoffice, Vendedor
- **Estados das vendas**: Em negociação, Perdido, Pendente, Ativo, Anulado
- **Comissões**: Definidas por Admin/BO após registo de venda
- **Dashboard**: Métricas mensais com possibilidade de extrair relatórios
- **Alertas**: Fim de fidelização apenas no dashboard (por agora)
- **Design**: Moderno/corporativo com cores Leiritrix (teal #0d474f, lime #c8f31d)
- **Logo**: Leiritrix fornecido pelo cliente

## Architecture Implemented

### Backend (FastAPI + MongoDB)
- **Auth**: JWT-based authentication with role-based access control
- **Users**: CRUD with Admin-only management
- **Sales**: Full CRUD with status management and loyalty tracking
- **Commissions**: Admin/BO assignment to sales
- **Dashboard**: Metrics, monthly stats, loyalty alerts
- **Reports**: Filterable sales reports with CSV export

### Frontend (React + Shadcn UI + Recharts)
- **Login**: Branded login page with credentials
- **Dashboard**: Metrics cards, bar/pie charts, status summary, loyalty alerts
- **Sales**: List with filters, create/edit forms, detail view
- **Reports**: Date range picker, filters, export to CSV
- **Users**: Admin-only user management with role/status toggle

### Database (MongoDB)
- **Collections**: users, sales
- **Indexes**: email (users), status/category/seller_id (sales)

## Features Completed
- [x] User authentication (Admin, Backoffice, Vendedor)
- [x] Sales registration with all fields
- [x] Status management (Em negociação → Ativo → etc.)
- [x] Loyalty period tracking (starts from "Ativo" date)
- [x] 7-month loyalty alerts in dashboard
- [x] Commission assignment by Admin/BO
- [x] Monthly metrics dashboard with charts
- [x] Sales reports with date range and export
- [x] User management (Admin only)

## Next Tasks / Improvements
1. **Email notifications** for loyalty alerts (SendGrid/Resend integration)
2. **Dashboard filters** by date range
3. **Partner management** - separate entity for partners
4. **Bulk operations** - update multiple sales status at once
5. **Audit log** - track changes to sales and commissions
6. **Mobile optimization** - responsive sidebar improvements

## Default Credentials
- **Admin**: admin@leiritrix.pt / admin123
- **Test Vendedor**: maria@leiritrix.pt / vendedor123
