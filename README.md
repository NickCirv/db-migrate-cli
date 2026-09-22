![Nicholas Ashkar — db-migrate-cli](assets/nicholas-ashkar/banner.png)

# db-migrate-cli

Applies versioned SQL migration files through PostgreSQL or SQLite adapters.






<a id="usage"></a>

<a id="create-a-migration"></a>

<a id="check-status"></a>

<a id="run-all-pending-migrations"></a>

<a id="rollback-last-migration"></a>

## What it does

- Migration creation and checksum tracking.
- Status.
- Up/down/redo.
- Validation.
- DB_DRIVER, DATABASE_URL and DB_FILE configuration.



<a id="install"></a>

<a id="configuration"></a>

## Quickstart

Prerequisites: Node.js `>=20` and npm. The checkout below pins the source used for this documentation.

```sh
git clone https://github.com/NickCirv/db-migrate-cli.git
cd db-migrate-cli
git checkout 4dd89bea44892628180098de7918345667b66ea2
node index.js --help
```

**Expected behavior (illustrative, not captured):** Shows migration commands without applying database changes.

Examples are source-inspected, **not runtime-tested**. See the research record for verification gaps.

## Boundaries and data

Up/down/redo change a database; inspect generated SQL and use backups. PostgreSQL relies on psql and SQLite support depends on available runtime/adapter tools. Declared Node minimum alone does not guarantee a usable driver.

## Development

The manifest defines `npm test` as:

```sh
node --test
```

The captured suite is a smoke check, not end-to-end behavior coverage. Examples include “entry is valid JavaScript”. Tests were not run for this documentation revision.

See [implementation and command reference](docs/REFERENCE.md) for the package scripts and inspected interfaces, and [research record](docs/RESEARCH.md) for the pinned source, document decisions and unresolved checks.

## License and contact

See [LICENSE](LICENSE) for the original terms and attribution. Legal text is unchanged.

[Nicholas Ashkar](https://nicholashkar.com/) · [Discuss a project](https://nicholashkar.com/#oxblood-contact)
