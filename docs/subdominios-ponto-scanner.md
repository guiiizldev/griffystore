# Subdominios para ponto e scanner

No DNS da Hostinger, crie:

```text
A     ponto      IP_DA_VPS
A     scanner    IP_DA_VPS
```

No Nginx da VPS, edite:

```bash
nano /etc/nginx/sites-available/griffy-store
```

Adicione estes blocos, mantendo o bloco principal da loja:

```nginx
server {
    listen 80;
    server_name ponto.griffystore.com.br;

    location / {
        proxy_pass http://127.0.0.1:3789/ponto/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3789/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name scanner.griffystore.com.br;

    location / {
        proxy_pass http://127.0.0.1:3789/scanner/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3789/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Teste e recarregue:

```bash
nginx -t
systemctl reload nginx
```

Quando o DNS propagar, emita SSL:

```bash
certbot --nginx -d ponto.griffystore.com.br -d scanner.griffystore.com.br
```

O scanner por camera exige HTTPS no celular.

