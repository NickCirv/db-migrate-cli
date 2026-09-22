# db-migrate-cli — documentation research

Reviewed 21 September 2026. Public GitHub source only.

## Revision and scope

- Commit: [`4dd89bea44892628180098de7918345667b66ea2`](https://github.com/NickCirv/db-migrate-cli/commit/4dd89bea44892628180098de7918345667b66ea2).
- Tree: `cd323509c2907d2d19055069ea2359b135ab1f63`; truncated: `false`.
- Capture: 6 of 6 eligible text files; all eligible text files.
- Method: package and entrypoint inspection, implementation-interface review, targeted behavior/limitation inspection, and test-source review. This is not an exhaustive correctness or security audit.
- Commands run against repository code: **none**. External services, deployment and npm publication were not verified.

## Claim and evidence map

| Documentation claim | Pinned evidence | Assessment |
| --- | --- | --- |
| Runtime, executable and development commands | [package.json](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/package.json) | Source declaration inspected; runtime unverified |
| Applies versioned SQL migration files through PostgreSQL or SQLite adapters. | [index.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/index.js) | Implementation interfaces inspected; behavior not executed |
| Migration creation and checksum tracking; status; up/down/redo; validation; DB_DRIVER, DATABASE_URL and DB_FILE configuration. | [index.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/index.js) | Source-backed scope, not a test result |
| Up/down/redo change a database; inspect generated SQL and use backups. PostgreSQL relies on psql and SQLite support depends on available runtime/adapter tools. Declared Node minimum alone does not guarantee a usable driver. | [index.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/index.js) | Material limits documented; service compatibility remains open |
| Existing checks | [test/smoke.test.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/test/smoke.test.js) | Test source read; no passing-run claim |

## Documentation inventory and disposition

| Existing document | Decision |
| --- | --- |
| [README.md](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/README.md) | Rewritten with source-specific purpose, direct checkout setup, limitations and verification status. Old section fragments retained where practical. |

Added `docs/REFERENCE.md` for the observed implementation and command surface, and this research record. Protected license and attribution files remain in their original locations without edits. No source or product UI was changed.

## Quality dimensions

| Dimension | Status | Evidence / next step |
| --- | --- | --- |
| Pinned provenance | Verified | Captured commit, tree and per-file hashes recorded below |
| Interface documentation | Partially verified | Source inspection only; run clean-checkout quickstart |
| Runtime behavior | Unverified | No repository execution in this review |
| Test results | Unverified | Existing tests were not run |
| Deployment / package availability | Unverified | No remote publish or live-service check |
| Visual / link checks | Unverified | Portfolio renderer and independent QA are separate from this authoring step |

## Unresolved issues

Up/down/redo change a database; inspect generated SQL and use backups. PostgreSQL relies on psql and SQLite support depends on available runtime/adapter tools. Declared Node minimum alone does not guarantee a usable driver.

## Captured source inventory

This lists captured provenance, not a claim that every line received a full audit. Binary/generated/excluded files are outside the eligible text capture.

| File | SHA-256 | Bytes |
| --- | --- | --- |
| [LICENSE](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/LICENSE) | `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d` | 1072 |
| [README.md](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/README.md) | `cbfaf20e1d35eda52c7b058b63e2b9adf9c9cb62a12f8c2559a8e629c7a44948` | 2168 |
| [package.json](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/package.json) | `66f92e95c5dc8e18c7a087f19d919c6ff36ddfb359d2cccf3a048ffb202c8b4d` | 516 |
| [.github/workflows/ci.yml](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/.github/workflows/ci.yml) | `e818f4e6bd805f798665dbbf04964d02f12fc59dd7f18903ad63d26d374ae3f0` | 380 |
| [index.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/index.js) | `a128845edde95aa47915155746a8c432dc56a5e55213809eb54792c0e55600b5` | 20288 |
| [test/smoke.test.js](https://github.com/NickCirv/db-migrate-cli/blob/4dd89bea44892628180098de7918345667b66ea2/test/smoke.test.js) | `31178f9e769b3cc662acbdb5a9984a51a26132adb2f1a6ecf1b6d94cc9470c1f` | 338 |
