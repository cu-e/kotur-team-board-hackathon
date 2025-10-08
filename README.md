# Kontur TeamBoard — backend (Express + TypeORM, PostgreSQL)

(Демо: https://stage-teamboard.arelon.org)

Инструмент для команд — «рабочая доска» с интеграциями экосистемы Контура.
Цель: закрыть **прозрачное взаимодействие между людьми и бизнес-системами** (Диадок/Экстерн/Толк и др.) без тяжелых процессов и перегрузов, характерных для Jira.

> В отличие от Jira, TeamBoard ставит **взаимодействие и скорость** на первое место: задачи рождаются прямо из событий в Контуре через вебхуки, исполнителя можно назначить **только** из членов группы, теги контролируются **ролями**, а источник задачи явно виден (метка + цвет). Это убирает «шум», самовольные назначения и «потерянные» интеграции.

---

## Что уже есть

* **JWT-аутентификация** (MVP).
* **Группы** и **доски** (boards) — участник видит только своё.
* **Задачи**: статус, дедлайн, описания, ссылки на первоисточник, теги, исполнитель.

    * Исполнитель — **только участник группы** (проверка на бэке).
    * Теги — только из списка тегов группы.
    * Источник задачи: `source` + **бэйдж интеграции** (`originName`, `originColor`).
* **Роли и права** внутри группы:

    * Базовые роли: `owner`, `admin`, `member` (создатель = owner).
    * **Настраиваемые роли** (`RoleDef`) с флагами: `manageTags`, `manageMembers`, `assignRoles`.
    * Выдача/отзыв пользовательских ролей участникам.
    * Владелец может повышать до admin/понижать и **удалять** участников (кроме owner).
* **Теги группы**: полный CRUD (создание/изменение/удаление) — только у кого есть `manageTags`.
* **Быстрый поиск** без похода в БД (in-memory индекс per group) по:

    * участникам (`type=member`), тегам (`type=tag`) — пополняется инкрементально.
* **Интеграции-вебхуки** (новый слой):

    * На каждую группу мы создаём **3 встроенных** интеграции (не удаляются):
      **Контур.Диадок**, **Контур.Экстерн**, **Контур.Толк**.
      У каждой — публичный endpoint `/hooks/:key`.
    * Можно добавлять **свои** интеграции: имя, цвет (HEX), доверенный домен, целевая доска. Ключ генерируется автоматически.
    * Публичный прием вебхуков: **POST `/hooks/:key`** (без авторизации).
      Тело — то же, что при создании задачи; бэкенд проставит `origin*` и корректный `source`.
* **Удаление доски** (каскадно) — owner/admin группы.
* **PostgreSQL** .

---

## Быстрый старт

### Требования

* Node.js 18+
* PostgreSQL 14+

### БД (локально через Docker compose)

```bash
docker compose up -d
```

### Конфигурация

Создайте `.env` в корне backend есть `.env.exemple`

### Установка и запуск

```bash
npm i
npm run dev          # старт в dev (TypeORM synchronize=true для MVP)
# либо
npm run build && npm start
```

API поднимется на `http://localhost:3000/api`, публичные вебхуки — на `http://localhost:3000/hooks`.


##Создана учетная запись `Admin Admin` Там интересные доски с которыми можно будет поиграться
---

## Архитектура (кратко)

```
src/
  controllers/       # REST-контроллеры
  services/          # бизнес-логика (Auth, Groups, Boards, Tasks, Tags, Roles, Integrations, Search)
  entities/          # TypeORM сущности (User, Group, Board, Task, Tag, RoleDef, ...)
  middleware/        # auth/access
  utils/             # утилиты (keys, dates, …)
```

### Ключевые сущности

* **Group**, **GroupMember(role: owner|admin|member)**
* **RoleDef**, **GroupMemberRole** — настраиваемые роли/права.
* **Board** — принадлежит группе.
* **Task** — принадлежит доске. Поля источника:

    * `source` (`manual|diadoc|extern|tolk|webhook`)
    * `originIntegrationId`, `originName`, `originColor`
* **GroupTag** — теги группы.
* **Integration** — вебхук интеграции (ключ, цвет, доверенный домен, целевая доска; builtin нельзя удалить).

---

## API (основные маршруты)

> Базовый префикс: **`/api`** (авторизация обязательна), вебхуки — **`/hooks`** (публично).

### Аутентификация

```
POST /api/auth/login
→ { token, user }
```

### Группы и участники

```
GET    /api/groups/me                              # мои группы
POST   /api/groups                                 # создать
POST   /api/groups/join                            # вступить по join-коду
GET    /api/groups/:groupId/members                # участники группы

# Управление участниками (owner-only)
PATCH  /api/groups/:groupId/members/:userId/role   # { role: 'admin'|'member' }
DELETE /api/groups/:groupId/members/:userId        # удалить участника
```

### Роли (настраиваемые)

```
GET    /api/groups/:groupId/roles
POST   /api/groups/:groupId/roles                  # { name, manageTags?, manageMembers?, assignRoles? }
PATCH  /api/groups/:groupId/roles/:roleId
DELETE /api/groups/:groupId/roles/:roleId
POST   /api/groups/:groupId/members/:userId/roles/:roleId
DELETE /api/groups/:groupId/members/:userId/roles/:roleId
```

### Теги группы

```
GET    /api/groups/:groupId/tags
POST   /api/groups/:groupId/tags                   # (manageTags)
PATCH  /api/groups/:groupId/tags/:tagId            # (manageTags)
DELETE /api/groups/:groupId/tags/:tagId            # (manageTags)
```

### Быстрый поиск (in-memory)

```
GET    /api/groups/:groupId/search?type=member|tag&q=иван&limit=5
POST   /api/groups/:groupId/search/reindex         # пересобрать индекс (admin/owner)
```

### Доски

```
GET    /api/boards/me
GET    /api/boards/group/:groupId
POST   /api/boards/group/:groupId                  # создать доску в группе
GET    /api/boards/:boardId
DELETE /api/boards/:boardId                        # удалить доску (owner/admin)
```

### Задачи

```
GET    /api/tasks/board/:boardId                   # фильтры: status, dueBefore, label, source
POST   /api/tasks/board/:boardId                   # { title, description?, assignee_user_id?, due_at?, labels?, source_link? }
PATCH  /api/tasks/:taskId                          # частичное обновление
DELETE /api/tasks/:taskId
```

> Валидации:
> — `assignee_user_id` обязан быть участником этой группы;
> — `labels` — только из тегов группы.

### Интеграции-вебхуки (CRUD)

```
GET    /api/groups/:groupId/integrations
POST   /api/groups/:groupId/integrations           # { name, color?, trustedDomain?, board_id? }
PATCH  /api/groups/:groupId/integrations/:id       # обновить настройки
DELETE /api/groups/:groupId/integrations/:id       # нельзя для builtin
POST   /api/groups/:groupId/integrations/:id/rotate-key
```

### Публичный приём вебхуков

```
POST   /hooks/:key
Headers:
  Content-Type: application/json
  X-Webhook-Domain: <trustedDomain>   # если задан в интеграции

Body:
{
  "title": "Оплатить счёт #42",
  "description": "Срок до пятницы",
  "assignee_user_id": "<uuid или null>",
  "due_at": "2025-10-10T12:00:00.000Z",
  "labels": ["срочно"],
  "source_link": "https://system.example.com/42"
}
```

**Ответ 201** → `Task` с заполненными `originName`, `originColor`, `originIntegrationId` и корректным `source` (`diadoc|extern|tolk` для встроенных, `webhook` для пользовательских).

Возможные ошибки:

* `404 NOT_FOUND` — неверный ключ или интеграция отключена (`active=false`);
* `400 NO_TARGET_BOARD` — в интеграции не настроена целевая доска;
* `403 UNTRUSTED_DOMAIN` — заголовок домена не совпал;
* `400 ASSIGNEE_NOT_MEMBER`, `400 UNKNOWN_TAGS`.

---

## Почему это «закрывает боль», которую Jira не решает хорошо

* **События → Задачи мгновенно.** Встроенные и пользовательские вебхуки создают задачи прямо из Диадока/Экстерна/Толка и любых внешних систем — без коннекторов/плагинов/админки.
* **Порядок и доверие.** Исполнителем нельзя назначить «кого угодно» — только участника группы. Теги централизованы и управляются ролями.
* **Прозрачный «след от источника».** Каждая задача несет «знак происхождения» (имя интеграции и цвет). В Jira такие метки часто теряются в полях/плагинах.
* **Меньше кликов — больше дела.** Для команд и стажёрских потоков это критично: не тратить время на «систему», а работать по сути.
* **Ставка на экосистему Контура.** Это не «ещё одна доска», а естественная шина задач между людьми и сервисами Контура.

---

## Примеры

### Создать интеграцию «Биллинг» и получить её ключ

```bash
# создать (нужен Bearer JWT, админ/owner группы)
curl -X POST http://localhost:3000/api/groups/<groupId>/integrations \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Биллинг","color":"A855F7","trustedDomain":"billing.example.com","board_id":"<boardId>"}'
```

Ответ (фрагмент):

```json
{ "id": "…", "name": "Биллинг", "key": "AbC123…", "color": "A855F7", "trustedDomain": "billing.example.com" }
```

### Отправить задачу на вебхук

```bash
curl -X POST http://localhost:3000/hooks/AbC123… \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Domain: billing.example.com" \
  -d '{"title":"Оплатить счёт #42","labels":["срочно"],"source_link":"https://billing.example.com/42"}'
```

---

## Безопасность

* Ключ вебхука — секрет; ротация: `POST /api/groups/:gid/integrations/:id/rotate-key`.
* Допзащита по домену: `trustedDomain` + `X-Webhook-Domain`/`Origin`/`Referer`.
* Доступ к CRUD интеграций/тегов/ролей — по ролям (owner/admin/настраиваемые).

---
