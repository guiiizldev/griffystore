# Griffy Store - Deploy na VPS Ubuntu 24.04

Este guia sobe o site/API da Griffy Store na VPS com Node.js, PM2, MySQL e Nginx.

## 1. Pacotes base

```bash
apt update && apt upgrade -y
apt install -y curl git unzip nginx mysql-server ufw
```

## 2. Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

## 3. Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Abra `3306/tcp` apenas se o sistema desktop da loja for acessar o MySQL direto pela internet. O ideal depois e usar VPN ou liberar somente o IP da loja.

## 4. Banco MySQL

Troque `SENHA_FORTE_AQUI` por uma senha forte.

```bash
systemctl enable mysql
systemctl restart mysql

mysql -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS griffy_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'griffy_user'@'localhost' IDENTIFIED BY 'SENHA_FORTE_AQUI';
CREATE USER IF NOT EXISTS 'griffy_user'@'%' IDENTIFIED BY 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON griffy_store.* TO 'griffy_user'@'localhost';
GRANT ALL PRIVILEGES ON griffy_store.* TO 'griffy_user'@'%';
FLUSH PRIVILEGES;
SQL
```

Teste local:

```bash
mysql -u griffy_user -p griffy_store -e "SELECT 'MYSQL OK' AS status;"
```

## 5. Enviar o projeto para a VPS

No Windows, compacte a pasta do projeto sem `node_modules`, `dist` antigo e arquivos temporarios. Na VPS:

```bash
mkdir -p /var/www/griffy-store
cd /var/www/griffy-store
```

Depois envie/extrai os arquivos nesse diretorio. Se usar `scp`:

```bash
scp griffy-store.zip root@IP_DA_VPS:/var/www/
ssh root@IP_DA_VPS
cd /var/www
unzip -o griffy-store.zip -d griffy-store
cd /var/www/griffy-store
```

## 6. Configurar `.env`

```bash
cd /var/www/griffy-store
nano .env
```

Conteudo recomendado:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=griffy_user
MYSQL_PASSWORD=SENHA_FORTE_AQUI
MYSQL_DATABASE=griffy_store

HOST=127.0.0.1
APP_PORT=3789
STOREFRONT_ALLOWED_ORIGIN=*
STOREFRONT_ADMIN_SECRET=TROQUE-POR-UMA-CHAVE-GRANDE-ALEATORIA
```

## 7. Instalar dependencias, buildar site e preparar banco

```bash
cd /var/www/griffy-store
npm install --omit=dev
npm install --prefix store-app
npm run build --prefix store-app
npm run db:schema
```

## 8. PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root
```

O comando `pm2 startup` vai mostrar outro comando. Copie e execute o comando que ele mostrar.

Verificar:

```bash
pm2 status
pm2 logs griffy-store-web --lines 80
curl http://127.0.0.1:3789/api/storefront/products?limit=1
```

## 9. Nginx

Crie:

```bash
nano /etc/nginx/sites-available/griffy-store
```

Conteudo, trocando `seudominio.com.br`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3789;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative:

```bash
ln -s /etc/nginx/sites-available/griffy-store /etc/nginx/sites-enabled/griffy-store
nginx -t
systemctl reload nginx
```

## 10. HTTPS com SSL

Depois que o dominio apontar para a VPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

## 11. Atualizar o site no futuro

```bash
cd /var/www/griffy-store
npm install
npm install --prefix store-app
npm run build --prefix store-app
npm run db:schema
pm2 restart griffy-store-web
```

