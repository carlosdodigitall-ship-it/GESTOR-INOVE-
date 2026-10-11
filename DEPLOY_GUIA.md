# Guia de Configuração e Ativação - GESTOR-INOVE (CloudZap)

Este repositório foi revisado, corrigido e integrado com a **Z-API**, **Supabase** e pronto para deploy na **Vercel**.

---

## 1. Supabase (Banco de Dados)

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Vá em **SQL Editor** no menu lateral esquerdo.
3. Clique em **New query**.
4. Se o banco já tiver tabelas, execute o conteúdo do arquivo:
   `supabase/migrations/20261010_complete_fix.sql`
   *(Se for um banco novo e vazio, você pode executar o `supabase/schema.sql`).*
5. Clique em **Run**. Todas as colunas, tabelas de cobrança, clientes e triggers de novo usuário serão criados/atualizados.
6. Em **Authentication** > **Providers** > **Email**:
   - Recomendamos deixar **Confirm email** desativado caso queira que o usuário acesse o painel imediatamente após o cadastro, ou ativado caso queira exigir confirmação de e-mail antes do primeiro acesso.

---

## 2. Vercel (Variáveis de Ambiente)

No painel da Vercel em **Project Settings** > **Environment Variables**, configure:

| Variável | Valor Recomendado / Descrição |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL do seu app (ex: `https://seu-dominio.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública `anon` do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta `service_role` do Supabase |
| `WHATSAPP_PROVIDER` | `zapi` |
| `ZAPI_BASE_URL` | `https://api.z-api.io` |
| `ZAPI_INSTANCE_ID` | ID da sua instância da Z-API |
| `ZAPI_TOKEN` | Token da sua instância da Z-API |
| `ZAPI_CLIENT_TOKEN` | Client-Token da sua conta Z-API (se configurado) |
| `CRON_SECRET` | Chave secreta aleatória para proteger o cron de cobranças |
| `RESEND_API_KEY` | Chave da Resend para e-mails de boas-vindas |

---

## 3. Conexão do WhatsApp via Z-API

1. Acesse a tela **WhatsApp** no menu lateral do sistema.
2. Se as chaves `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN` já estiverem na Vercel, clique diretamente em **Conectar WhatsApp**.
3. Se preferir configurar pela interface, clique no botão **Configurar Z-API**, informe o ID da Instância e Token, e clique em **Salvar e Conectar**.
4. O **QR Code oficial da Z-API** será renderizado na tela.
5. Abra o WhatsApp no celular > **Aparelhos Conectados** > **Conectar um aparelho** e escaneie o QR Code.
6. A tela detectará a conexão e mudará o status para **Conectado**.
7. Você pode enviar uma mensagem de teste no campo inferior para confirmar a entrega.

---

## 4. Gestão e Automação de Cobranças

1. No menu **Cobranças**:
   - Visualize métricas de valores em aberto, faturas vencidas e recebidas.
   - Cadastre faturas clicando em **Nova Cobrança**, selecionando o cliente, valor, vencimento e Pix Copia e Cola.
2. **Envio Imediato via WhatsApp**:
   - Na linha de qualquer cobrança, clique no botão verde **WhatsApp**. O sistema envia imediatamente a mensagem personalizada com valor, vencimento e Pix para o cliente via Z-API e marca como enviado.
3. **Disparo Automático em Lote**:
   - Clique em **Disparar Cobranças Automáticas** no topo da página. O sistema localiza todas as faturas vencendo hoje ou atrasadas de clientes com automação ativada e envia as notificações no WhatsApp.
4. **Rotina Agendada (Vercel Cron)**:
   - O arquivo `vercel.json` já inclui a rota `/api/cron/cobrancas` programada para rodar diariamente às 09:00 UTC (06:00 BRT).
