# Files Server (Node.js)

Бекенд файлового менеджера на Node.js. Хостится на Wispbyte (NodeJS-stack).

## Стек

- **Express 4** — HTTP-сервер
- **pg** — PostgreSQL клиент
- **bcryptjs** — хеширование паролей (pure JS, без нативной сборки)
- **jsonwebtoken** — JWT
- **multer** — multipart upload
- HMAC-SHA256 (встроенный `crypto`) — подпись URL для скачивания

## Локальный запуск

```bash
cd server-node
npm install
npm start
```

Сервер слушает порт из `PORT` (по умолчанию 8080). База — Neon из `DATABASE_URL`.

## Деплой на Wispbyte

1. **Создать инстанс с NodeJS-stack** в Wispbyte
2. **Залить файлы** через SFTP/файлменеджер в `/home/container/`:
   - `index.js`
   - `package.json`
   - `src/` (вся папка)
   - `migrations/` (вся папка)
   - `.env`
3. **В `.env` поправить** `PORT` на тот, что выделил Wispbyte (12667 в вашем случае)
4. **В `.env` поправить** `ORIGIN` на URL фронта
5. **Restart** инстанса — Wispbyte автоматически запустит:
   ```
   npm install   # установит зависимости
   node /home/container/index.js
   ```

В логах должно быть:
```
[db] connected
[db] migrations applied
[server] listening on :12667
```

## Environment Variables

| Имя | Описание | По умолчанию |
|---|---|---|
| `DATABASE_URL` | строка подключения к Postgres | — (обязательно) |
| `JWT_SECRET` | секрет для JWT (≥16 символов) | — (обязательно) |
| `STORAGE_URL_SECRET` | секрет для HMAC signed URL (≥16) | — (обязательно) |
| `STORAGE_DIR` | папка для файлов | `./storage` |
| `PORT` | HTTP-порт | `8080` |
| `ORIGIN` | разрешённые CORS-домены (через запятую) | `http://localhost:5173` |
| `MAX_UPLOAD_MB` | макс. размер файла, МБ | `100` |
| `SIGNED_URL_TTL` | срок жизни подписанного URL, сек | `600` |

## API

То же, что у Go-версии (см. `../server/README.md`).

Все эндпоинты `/api/*` (кроме `auth/signup` и `auth/signin`) требуют
`Authorization: Bearer <jwt>`. `/storage/{path}?token=...&exp=...` —
без JWT, но с HMAC-подписью.

## Структура

```
server-node/
├── index.js                  — точка входа
├── package.json
├── .env                      — секреты (gitignored)
├── migrations/
│   └── 0001_init.sql         — единственная миграция
├── src/
│   ├── config.js             — загрузка env
│   ├── db.js                 — pg pool + миграции
│   ├── auth.js               — bcrypt + JWT
│   ├── middleware.js         — auth middleware
│   ├── storage.js            — Signer + LocalStorage
│   └── routes/
│       ├── auth.js           — /api/auth/*
│       ├── folders.js        — /api/folders/*
│       ├── files.js          — /api/files/*
│       ├── trash.js          — /api/trash/*
│       └── storage.js        — /storage/* handler
└── storage/                  — файлы (gitignored)
```
