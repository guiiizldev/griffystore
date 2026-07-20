# Deploy da loja virtual na VPS

Este modelo usa a VPS como hospedagem do site e da API. O dominio aponta para a VPS e o Nginx entrega HTTPS.

## 1. DNS do dominio

No painel do dominio, crie ou altere:

```txt
A     @      IP_DA_VPS
A     www    IP_DA_VPS
```

A propagacao pode levar alguns minutos ou horas.

## 2. Pacotes da VPS

```bash
apt update
apt install -y nodejs npm nginx certbot python3-certbot-nginx
npm install -g pm2
```

## 3. Enviar o projeto

Suba a pasta do projeto para:

```txt
/opt/griffy-store
```

Depois rode:

```bash
cd /opt/griffy-store
npm install
npm run web:build
npm run db:schema
```

## 4. Configurar `.env`

Crie `/opt/griffy-store/.env`:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=griffy_user
MYSQL_PASSWORD=SENHA_DO_MYSQL
MYSQL_DATABASE=griffy_store

APP_PORT=3789
HOST=127.0.0.1
STOREFRONT_ALLOWED_ORIGIN=https://seudominio.com.br
STOREFRONT_ADMIN_SECRET=coloque-uma-chave-bem-grande-aqui
```

Se o MySQL estiver em outro servidor, troque `MYSQL_HOST`.

## 5. Rodar com PM2

```bash
cd /opt/griffy-store
pm2 start npm --name griffy-store-web -- run web:start
pm2 save
pm2 startup
```

## 6. Nginx

Crie `/etc/nginx/sites-available/griffy-store`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

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

## 7. SSL

```bash
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

## 8. Atualizar o site depois

```bash
cd /opt/griffy-store
npm run web:build
pm2 restart griffy-store-web
```

## URLs

- Site: `https://seudominio.com.br`
- Catalogo: `https://seudominio.com.br/catalogo`
- Admin do site: `https://seudominio.com.br/admin`
- API: `https://seudominio.com.br/api/storefront/config`
