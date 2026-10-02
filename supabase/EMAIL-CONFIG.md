# Gestor Zap V2 — confirmação de e-mail

## Fluxo implementado
1. O cadastro cria o usuário no Supabase Auth com `full_name`, `phone` e `organization_name` em `user_metadata`.
2. O cadastro passa `emailRedirectTo` para `/auth/confirm?next=/dashboard`.
3. O template de confirmação usa `{{ .Data.full_name }}` e `{{ .Email }}`.
4. O botão do e-mail envia `token_hash` para `/auth/confirm`.
5. `app/auth/confirm/route.ts` valida o token com `verifyOtp`.
6. O cliente SSR grava a sessão em cookie.
7. O usuário é redirecionado para `/dashboard`.

## Configuração obrigatória no Supabase Dashboard

No projeto `GESTOR-INOVE-`:

### 1. Authentication → Providers → Email

Ative **Confirm email**.

O cadastro continuará criando o usuário, mas a sessão ficará disponível somente depois da confirmação do endereço.

### 2. Authentication → URL Configuration

Configure a **Site URL** para o domínio de produção do Gestor Zap V2.

Adicione aos **Redirect URLs**:

- `https://gestor-inove-t4nt-3uftfuax9-projects-digitais.vercel.app/auth/confirm`
- `http://localhost:3000/auth/confirm`

Se houver domínio próprio, adicione também:

- `https://SEU-DOMINIO/auth/confirm`

### 3. Authentication → Email Templates → Confirm signup

Use o conteúdo de `supabase/templates/confirm-signup.html`.

O botão deve manter:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`

### 4. SMTP

Para produção, configure um SMTP próprio no Supabase Authentication. O SMTP padrão do Supabase é indicado para testes e possui limitações de envio.

## Segurança

A senha criada no cadastro **não é enviada por e-mail**. O Supabase não disponibiliza a senha em texto puro para esse tipo de template, e o Gestor Zap V2 não deve enviar credenciais por e-mail.

## Observação

O arquivo HTML deste repositório é a fonte do template. Em um projeto Supabase hospedado, o template precisa ser salvo na área Authentication → Email Templates do Dashboard.