# Contributing

Thanks for your interest. Markup is a small, single-maintainer project. Contributions of any size are welcome, with one process step before code lands.

## Contributor License Agreement (CLA)

Before we can merge your contribution, you sign the project CLA — a short agreement that confirms you have the right to submit the code and grants the maintainer the rights needed to keep the project's licensing flexible.

The flow takes one comment on your first pull request:

1. Open your PR as usual.
2. The CLA Assistant bot leaves a comment with the CLA link.
3. Reply on the PR with exactly: `I have read the CLA Document and I hereby sign the CLA`
4. You're set — the signature applies to all your future contributions to this repository.

The CLA text lives in [`CLA.md`](CLA.md). Read it before signing.

## Code conventions

Before opening a PR:

1. Read [`docs/INDEX.md`](docs/INDEX.md) — every change starts there. It points you at the docs that apply to your task.
2. Run the pre-push checklist from [`docs/ci.md`](docs/ci.md):

   ```bash
   pnpm biome check . && pnpm tsc --noEmit && pnpm test && pnpm build
   ```

3. Follow [`docs/git/conventions.md`](docs/git/conventions.md) for commit message format (Conventional Commits, scoped, under 72 chars).

## Reporting bugs / requesting features

For anything substantial, open an [issue](https://github.com/alkg-cloud/markup/issues/new) before going to a PR — that way we can align on approach before you invest in code.
