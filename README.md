# Filescool

Облачный файловый менеджер в стиле пиксель-арт. авторизация, файловое хранилище,
публичные ссылки на файлы и папки, ZIP скачивания папок.

🌐 **Сайт**: <https://filescool.mooo.com>

## Стек

### Frontend
- **React 18** + **TypeScript** + **Vite** — SPA
- **React Router** — маршрутизация
- **TanStack Query** — серверное состояние, кеширование, оптимистичные обновления
- **Zustand** — состояние авторизации
- **Lucide React** — SVG-иконки

### Backend
- **Node.js 20+** + **Express 4**
- **PostgreSQL 15+** (через `pg`)
- **JWT** (HS256, 7-дневные токены) + **bcryptjs** для паролей
- **multer** — multipart upload
- **archiver** — стримовая ZIP-сборка папок

## Возможности

- Регистрация / вход
- Папки с любой вложенностью, кириллица в именах
- Загрузка: один файл, несколько файлов, целая папка (через `webkitdirectory`)
- Превью изображений, видео, аудио, PDF, текста
- Переименование файлов и папок
- Soft-delete с возможностью восстановления из корзины
- Публичные ссылки на файлы и папки (с возможностью отзыва)
- Скачивание папки одним ZIP

### 1. Backend

```bash
cd server-node
cp .env.example .env
npm install
npm start
```

Слушает `:8080` по умолчанию. Миграции применятся автоматически.

### 3. Frontend

В другом терминале:

```bash
cp .env.example .env
npm install
npm run dev
```

Откроется на `http://localhost:5173`.

## Структура проекта

```
client-a-server-f-files/
├── src/                     # фронт (React + TS)
├── server-node/             # бэк (Node.js + Express + Postgres)
├── dist/                    # сборка фронта (gitignored)
├── index.html               # HTML-shell для SPA
├── vite.config.ts
├── tsconfig.*.json
└── package.json
```

## Архитектура

- **API**: REST `/api/auth/*`, `/api/folders/*`, `/api/files/*`, `/api/trash/*`
- **Публичные ссылки**: `/share/:token/{info,content,file/:id,zip}`
- **Подписанные URL** для приватных скачиваний: `/storage/<path>?token=...&exp=...`
- **Изоляция пользователей**: все запросы фильтруются по `owner_id` из JWT
- **Хранилище**: файлы лежат в `STORAGE_DIR` как `{owner_id}/{uuid}-{filename}`

