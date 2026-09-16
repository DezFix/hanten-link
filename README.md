# hanten-link (test)

Cloudflare Worker для шаринг-ссылок Hanten.

- `GET /m?s=SOURCE&u=/rel/url&p=https://...` — метаданные тайтла подтягиваются
  на сервере (нет проблем с CORS), боты мессенджеров получают OG-разметку
  (превью с обложкой), люди — лендинг с кнопками.
- `GET /` — редирект на сайт.

## Деплой

Нужны секреты репозитория:

- `CLOUDFLARE_API_TOKEN` — токен с правами **Edit Cloudflare Workers**
  (dash.cloudflare.com → My Profile → API Tokens → Create Token →
  шаблон «Edit Cloudflare Workers»);
- `CLOUDFLARE_ACCOUNT_ID` — ID аккаунта (правая колонка на главной
  дашборда).

Пуш в `main` деплоит автоматически. Адрес: `https://hanten-link.<subdomain>.workers.dev/m?...`
(сабдомен виден в Workers → Overview после первого деплоя).
