# Git Conventions

## Commit Message Format

All commits follow **Conventional Commits**:

```
<type>(<scope>): <description>
```

- **Subject line only** — no body, no footer, no `Co-Authored-By`
- Keep the description under 72 characters
- Lowercase the description (the description, not the scope)

## Allowed Types

| Type       | Usage                              |
|------------|------------------------------------|
| `feat`     | New feature or capability          |
| `fix`      | Bug fix                            |
| `docs`     | Documentation only                 |
| `style`    | Formatting, no logic changes       |
| `refactor` | Code restructuring with no behaviour change |
| `test`     | Adding or updating tests           |
| `chore`    | Maintenance (deps, configs, scripts) |
| `perf`     | Performance improvement            |

## Scopes

Use a scope that maps to the surface being changed:

- **Schema**: `schema`, `migration`
- **API**: `api`, `auth`, `routes`
- **Lib helpers**: `intent`, `diff`, `region`, `mockup`, `annotation`
- **UI**: `ui`, `design`
- **Domain**: `agent-loop`
- **Infrastructure**: `tooling`, `tsconfig`, `deps`, `scripts`
- **Routing**: `routing`

## Good vs Bad

```bash
# Good — natural and descriptive
git commit -m "feat(api): GET /annotations/:id/intent with puppeteer + sidecar cache"
git commit -m "fix(routing): rename _mockups → /m/ (Next 16 private folder bug)"
git commit -m "test: elaborate mockup fixtures + coverage-gaps integration tests"
git commit -m "chore(deps): add puppeteer for server-side DOM resolution"

# Bad — generic or robotic
git commit -m "Update files"
git commit -m "Implement feature as requested"
git commit -m "Add code"
```

## Development Workflow

Commit at every meaningful checkpoint:

1. **After schema migration** — `feat(schema): add Annotation.intentType + createdOnVersionId`
2. **After service helper** — `feat(annotation): accept intentType + createdOnVersionId`
3. **After route validation** — `feat(api): validate intent_type on POST /annotations`
4. **After UI piece** — `feat(ui): chip selector for annotation intent type`
5. **After tests pass for a piece** — bundle the test with the feature commit OR a follow-up `test(<scope>): …`
6. **After refactoring** — `refactor(intent): tighten Drawing union with kind: 'geo' discriminator`

## Rules

- **Never** make large commits with many unrelated changes — one logical scope per commit
- **Never** use generic messages like "fix bug" or "update code"
- Keep commits small and frequent — the agent-loop work landed across 21 commits across 8 phases
- Messages explain the **why** when non-obvious (the scope alone often answers the what)
- Do not include `Co-Authored-By:` trailers — the human author is the canonical author
- Do not include emoji or marketing language ("Implements amazing new feature")
- The body and footer are forbidden — the subject must stand alone

## Branches

- **`main`** — protected, always green
- **`feat/<short-name>`** — feature branches; squash-merge to main is fine but rebasing-then-fast-forward keeps history linear
- Long-lived development branches (e.g. `feat/v1.1`) accumulate granular commits that ship to main as a single squash OR keep the granular history with a fast-forward — choose per branch, document on the PR

## Commit ordering for new endpoints

When introducing a new endpoint with a backing helper + UI:

1. Schema or dependency commit (`chore(deps): add diff package`)
2. Helper / service commit (`feat(diff): unified-diff apply with typed errors`)
3. Route commit (`feat(api): PATCH /mockups/:id/version-patch with unified diffs`)
4. UI commit if applicable
5. Doc commit (`docs(agent-loop): document patch-format conventions`)

This ordering means each commit either passes tests in isolation or is gated behind the next commit's tests. Bisecting against a test failure points at the right commit.
