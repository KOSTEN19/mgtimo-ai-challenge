# Прод-архитектура мгтимо

```
Интернет
   │  :80 / :443
   ▼
┌─────────┐     app (internal)      ┌─────────┐
│  nginx  │ ───────────────────────►│   web   │  SQLite volume
│  edge   │     upstream:3000       │  Next   │  /data/mgtimo.db
└─────────┘                         └─────────┘
   │
   ▼  access.log
fail2ban (на хосте) → iptables/nftables ban
```

## Слои

| Слой | Где | Зачем |
| --- | --- | --- |
| Edge | `nginx` в Compose | TLS, редирект HTTP→HTTPS, rate limit, security headers |
| App | `web`, сеть `app` internal | Next.js **не** слушает публичный IP |
| Data | volume `mgtimo-data` | SQLite; позже можно заменить на Postgres без смены nginx |
| Host | fail2ban + ufw/firewall | Бан по логам nginx; SSH |

## Локальный / серверный запуск стека

1. `.env` в корне: `SESSION_SECRET`, `COOKIE_SECURE=true`
2. Сертификаты в `deploy/certs/` (см. `certs/README.md`)
3. Из корня репо:

```bash
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
```

Только приложение без nginx (разработка): корневой `docker compose up` → `127.0.0.1:3000`.

## fail2ban

На **хосте** (не в контейнере):

```bash
sudo apt install fail2ban
sudo cp deploy/fail2ban/filter.d/*.conf /etc/fail2ban/filter.d/
sudo cp deploy/fail2ban/jail.d/mgtimo.conf /etc/fail2ban/jail.d/
# поправьте logpath на реальный путь к deploy/logs/nginx/access.log
sudo systemctl enable --now fail2ban
sudo fail2ban-client status mgtimo-nginx-limit
```

Опционально: jail `mgtimo-auth` по строкам `mgtimo-auth-fail ip=…` из логов `web`.

## Масштабирование

- Сейчас: 1× web + SQLite — нормально для кабинета вуза.
- Дальше: Postgres вместо SQLite (Prisma), несколько реплик `web` в `upstream mgtimo_web` — nginx уже готов к списку серверов.
- Статика/CDN не обязательны: ассеты в образе.
