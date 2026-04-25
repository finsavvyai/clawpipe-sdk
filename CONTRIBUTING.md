# Contributing to clawpipe-ai

Thanks for considering a contribution. This SDK is MIT-licensed and we welcome
patches, bug reports, and provider integrations.

## Setup

```bash
git clone https://github.com/finsavvyai/clawpipe-sdk.git
cd clawpipe-sdk
npm install
npm test
```

You will need Node 18+ and a working TypeScript toolchain (bundled via
`devDependencies`).

## Code style

- TypeScript strict mode (see `tsconfig.json`).
- Tests are written with [Vitest](https://vitest.dev). Run `npm test` for the
  full suite or `npx vitest <file>` to focus on one module.
- No linter beyond `tsc --noEmit` (`npm run lint`). Keep imports tidy; the
  test suite is the source of truth for behavior.

## File-size cap

**Hard limit: 200 lines per source file** (`src/**/*.ts`). When a file
crosses 200 lines, split it by responsibility — one pipeline stage or one
rule pack per file. Tests are exempt but should still stay focused.

## Pull request process

1. Fork the repo and create a topic branch (`feat/`, `fix/`, `docs/` prefix).
2. Add or update tests for any behavior change. Bug fixes require a failing
   test first, then the fix.
3. Run `npm test` and `npm run lint` locally — both must pass.
4. Open a PR against `main` with a short description of the change and a
   link to any related issue.
5. CI (`./.github/workflows/ci.yml`) runs the same checks on Node 20.

We aim to review within a few business days. Non-trivial changes may benefit
from a discussion issue first.

## Reporting bugs

Open an issue with:

- Minimal reproduction (a few lines of code is ideal).
- Expected vs actual behavior.
- Node version, SDK version, and provider involved (if applicable).

## Security

Do not file security issues publicly. Email security@clawpipe.ai with
details and we will respond within one business day.

## Code of Conduct

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
By contributing you agree to abide by its terms.
