# Inicializacao da VPS

O Nginx encaminha as requisicoes para `127.0.0.1:3789`. O estado online do
PM2 sozinho nao confirma que o servidor HTTP esta atendendo.

Em 23/10/2026, apos reiniciar a VPS, o processo iniciou antes do MySQL.
A migracao recebeu ECONNREFUSED, mas o pool manteve o Node aberto sem
iniciar a porta HTTP. O resultado foi erro 502 no site, API e ponto.

`src/server/public.js` agora encerra com codigo 1 em falhas de inicializacao
ou da porta, permitindo que o PM2 reinicie o processo automaticamente.
Teste: `npm run test:public-startup` (nao acessa banco real).

Na VPS com MySQL local, instalar o drop-in de ordenacao de inicializacao:

```sh
cd /var/www/griffystore
install -d -m 755 /etc/systemd/system/pm2-root.service.d
install -m 644 deploy/systemd/pm2-root.service.d/griffystore.conf /etc/systemd/system/pm2-root.service.d/griffystore.conf
systemctl daemon-reload
```

Nao e necessario reiniciar MySQL, Nginx nem os outros aplicativos.
Reinicie somente o aplicativo apos atualizar seu codigo:

```sh
pm2 restart griffystore
curl --fail --retry 10 --retry-connrefused --retry-delay 2 http://127.0.0.1:3789/api/health
pm2 save
chmod 600 /root/.pm2/dump.pm2
```

O drop-in espera a inicializacao do MySQL no boot; nao reinicie a VPS apenas
para testar esta configuracao durante o funcionamento da loja.
