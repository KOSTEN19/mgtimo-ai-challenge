# TLS-сертификаты

Сюда кладутся файлы, которые монтирует nginx:

- `fullchain.pem` — сертификат (+ цепочка)
- `privkey.pem` — приватный ключ

## Self-signed (пока нет домена)

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/CN=mgtimo.local"
```

## Let's Encrypt (когда есть домен и DNS A → VPS)

На хосте с запущенным стеком (порт 80 свободен для challenge):

```bash
certbot certonly --webroot -w deploy/certbot-www -d example.com
# затем скопируйте/сделайте symlink:
#   live/example.com/fullchain.pem → deploy/certs/fullchain.pem
#   live/example.com/privkey.pem   → deploy/certs/privkey.pem
```

После смены сертификата: `docker compose -f deploy/docker-compose.yml exec nginx nginx -s reload`
