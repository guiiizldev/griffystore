# Migrar o banco da Griffy Store para uma VPS

Este guia leva os dados do MySQL local do XAMPP para um MySQL na VPS e depois aponta os computadores para o mesmo banco remoto.

## 1. Preparar o MySQL na VPS

No MySQL da VPS, crie o banco e um usuario proprio para a loja:

```sql
CREATE DATABASE IF NOT EXISTS griffy_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'griffy_user'@'%' IDENTIFIED BY 'TROQUE_POR_UMA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON griffy_store.* TO 'griffy_user'@'%';
FLUSH PRIVILEGES;
```

Depois libere a porta `3306` apenas para IPs confiaveis, como o IP da loja e o IP do notebook do proprietario. Evite deixar MySQL aberto para o mundo todo.

## 2. Exportar o banco local do XAMPP

No PC onde esta o XAMPP com os dados atuais, rode:

```powershell
npm run db:export:local
```

O arquivo `.sql` sera salvo em `database\backups`.

Se o banco local tiver usuario/senha diferentes:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/export-local-db.ps1 -User root -Password "SENHA" -Database griffy_store
```

## 3. Importar o backup na VPS

Troque `IP_DA_VPS`, usuario, senha e caminho do arquivo `.sql`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-db-to-vps.ps1 -DumpPath "database\backups\griffy_store-YYYYMMDD-HHMMSS.sql" -HostName "IP_DA_VPS" -User "griffy_user" -Password "SENHA_FORTE" -Database "griffy_store" -CreateDatabase
```

## 4. Apontar o sistema para a VPS

No PC da loja e no notebook do proprietario, configure o `.env`:

```powershell
npm run db:config -- -HostName "IP_DA_VPS" -User "griffy_user" -Password "SENHA_FORTE" -Database "griffy_store" -AlsoInstalledApp
```

O parametro `-AlsoInstalledApp` tambem atualiza a configuracao do app instalado em `%APPDATA%`.

## 5. Atualizar/criar tabelas no banco remoto

Depois de apontar para a VPS, rode:

```powershell
npm run db:schema
```

## 6. Teste recomendado

Abra o sistema no PC da loja, crie uma venda pequena de teste e veja se ela aparece tambem no notebook do proprietario. Se aparecer, os dois estao usando o mesmo banco da VPS.

## Observacoes importantes

- Use senha forte para o usuario `griffy_user`.
- Configure backup automatico diario na VPS.
- O sistema depende da internet quando estiver usando banco remoto.
- Se a loja ficar sem internet, o sistema nao conseguira vender ate a conexao voltar.
- Para acesso mais seguro, o ideal e usar VPN entre loja/notebook e VPS, ou liberar a porta do MySQL somente para IPs fixos autorizados.
