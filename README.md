<div align="center">

# db-migrate-cli

**Run SQL migrations without a framework — PostgreSQL and SQLite, zero dependencies**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?labelColor=0B0A09)](LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?labelColor=0B0A09)](package.json)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933?labelColor=0B0A09&logo=node.js&logoColor=white)](package.json)

</div>

## Install

```bash
npx github:NickCirv/db-migrate-cli --help
```

Or install globally:

```bash
npm install -g github:NickCirv/db-migrate-cli
```

## Usage

```bash
# Create a migration
db-migrate create add_users_table

# Check status
DB_DRIVER=sqlite DB_FILE=./dev.db db-migrate status

# Run all pending migrations
DATABASE_URL=postgres://user@localhost/mydb db-migrate up

# Rollback last migration
db-migrate down
```

| Command | Description |
|---|---|
| `create <name>` | Create a new migration file in `./migrations/` |
| `status` | Show applied and pending migrations |
| `up [--count N]` | Run all pending (or next N) |
| `down [--count N]` | Rollback last N migrations (default: 1) |
| `redo` | Rollback then re-apply the last migration |
| `validate` | Check migration files for SQL structure issues |

## Configuration

```bash
DATABASE_URL=postgres://user@localhost:5432/mydb   # PostgreSQL
DATABASE_URL=sqlite:./dev.db                        # SQLite via URL
DB_DRIVER=sqlite DB_FILE=./dev.db                   # SQLite via env vars
```

## What it does

`db-migrate-cli` tracks applied SQL migrations in a `_migrations` table alongside your data. Each migration runs inside a transaction — if it fails, the database rolls back automatically. File checksums (SHA-256) are stored so you can detect if a migration was modified after being applied.

Migration files live in `./migrations/` as timestamped `.sql` files with `-- UP` and `-- DOWN` sections.

```sql
-- UP
CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE);

-- DOWN
DROP TABLE users;
```

---
<sub>Zero dependencies · Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
