# db-migrate-cli — implementation reference

Source revision: `4dd89bea44892628180098de7918345667b66ea2`. This reference records source declarations; it is not a transcript of a successful run.

## Entrypoint and runtime

[package.json](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/package.json) declares `index.js`. Node.js `>=20` and npm.

Executable mapping: `db-migrate-cli` → `./index.js`, `dbm` → `./index.js`.

## Supported workflow

Migration creation and checksum tracking; status; up/down/redo; validation; DB_DRIVER, DATABASE_URL and DB_FILE configuration.

Up/down/redo change a database; inspect generated SQL and use backups. PostgreSQL relies on psql and SQLite support depends on available runtime/adapter tools. Declared Node minimum alone does not guarantee a usable driver.

## Command reference

The commands below use the installed executable name. From the pinned checkout, replace it with the `node` entrypoint shown above. Options and command branches were cross-checked against captured source; examples are not execution transcripts.

| Command | Description |
|---|---|
| `create <name>` | Create a new migration file in `./migrations/` |
| `status` | Show applied and pending migrations |
| `up [--count N]` | Run all pending (or next N) |
| `down [--count N]` | Rollback last N migrations (default: 1) |
| `redo` | Rollback then re-apply the last migration |
| `validate` | Check migration files for SQL structure issues |

## Package scripts

| Script | Exact command |
| --- | --- |
| `test` | `node --test` |

## Environment references

The implementation reads `DATABASE_URL`, `DB_DRIVER`, `DB_FILE`. Some are optional or mode-specific; inspect their call sites before configuring a service. Credentials and endpoint values are never supplied by this document.

## Implementation sources

[index.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/index.js).

## Verification boundary

No repository code, tests, network operation, hook installer or migration was executed for this review. Source inspection supports the documented interface; runtime correctness and external-service compatibility remain unverified.
