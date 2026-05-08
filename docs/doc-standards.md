# Documentation Standards

Rules for creating and maintaining docs in this project.

## Language

- All documentation is written in **English**
- Use clear, direct language — no filler

## File organization

- Group docs by surface in folders: `api/`, `data/`, `frontend/`, `agent-loop/`, `git/`
- One topic per file — if a file covers multiple unrelated topics, split it
- Keep files short — prefer many small files over few large ones
- File names use `kebab-case.md`

## Index files

- Every folder with 3+ files has its own `INDEX.md`
- The root `docs/INDEX.md` references every doc, organised as a task-based lookup ("when doing X, read Y")
- When creating a new doc, **always** add it to the relevant index files
- When deleting a doc, **always** remove it from all index files

## Structure within a doc

- Start with a top-level `#` heading matching the topic
- Use `##` for major sections, `###` for subsections — don't skip heading levels
- Lead with the rule or convention, then provide examples
- Include code examples where applicable — keep them minimal and realistic
- Use bold for key terms on first mention
- Use tables for structured comparisons or references
- Use lists for rules and conventions

## When to create a new doc

- A new surface or tool is introduced to the project
- An existing doc exceeds ~150 lines — split it by subtopic
- A pattern or convention applies across multiple files and needs a single source of truth

## When to update an existing doc

- A pattern, convention, or architectural decision changes
- A new library or tool replaces an existing one
- Code examples become outdated or incorrect
- An endpoint's response shape, auth model, or cache key changes (agent-loop docs especially)

## Snapshot-only rule

Docs describe what ships at HEAD. They are not journals. Forbidden in the doc body:

- Status bands (`Status: shipped`, `Resolved: …`)
- Tombstones, legacy markers, or "removed in vX" notes for deleted content
- Changelog bands (`amendment YYYY-MM-DD`, `Action: amended`)
- Date stamps or version stamps (`as of YYYY-MM-DD`, `iter-N`, `v1.2 design language`)
- Reconciliation banners recording past rollbacks

Write in **declarative present tense** — describe only what currently ships. When something changes, edit the body in place: add, restate, or delete. The history of edits lives in `git log -- <file>`, not in the file.

Point-in-time artefacts (audit reports, design explorations, brainstorm notes) live in dated folders outside the snapshot docs — typically `docs/qa/<date>-…`, `docs/superpowers/{specs,plans}/<date>-…`. The snapshot docs link to those when context is needed but never inline their content.

## What not to document

- Implementation details that can be read from the code itself (file paths, function signatures, internal helpers)
- Temporary decisions or work-in-progress state
- Duplicate information already covered in another doc — link to it instead
- Past failures or workarounds that no longer apply (the git log captures those)
