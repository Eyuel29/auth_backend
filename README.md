# syn_backend

### Overview

syn_backend is a Bun + Express backend project integrated with BetterAuth for Google and WeChat authentication. It uses SQLite as the database and is designed for both development and production workflows.

---

### 1. Clone the repository

```bash
git clone https://github.com/Eyuel29/auth_backend.git
cd auth_backend
```
---

### 2. Install dependencies

#### Development

```bash
bun install
```

#### Production

```bash
bun install --production
```

> Note: Production install excludes devDependencies like TypeScript types, linters, and hot reload tools.

---

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT
ALLOWED_ORIGIN
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
WECHAT_OAUTH_CLIENT_ID
WECHAT_OAUTH_CLIENT_SECRET
WECHAT_SYNTHETIC_EMAIL_DOMAIN
WECHAT_DEBUG
BETTER_AUTH_SECRET
BASE_URL
```
---

### 4. BetterAuth setup

#### Generate auth scaffolding

```bash
bun auth:generate
```

#### Run database migrations

```bash
bunx auth:migrate
```

> These commands ensure authentication is properly configured.

---

### 5. Running the app

#### Development (hot reload)

```bash
bun dev
```

#### Production

```bash
bun start
```
---
