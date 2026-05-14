---
name: fix-qa-findings
description: Use when a visual-qa report exists and code fixes are needed to resolve the divergences and bugs found. Takes the QA report and optional user-provided focus points as input, fixes the code, runs code review, deploys, and re-runs visual-qa for a final verification report.
---

# Fix QA Findings

Fix divergences and bugs identified by the visual-qa skill, then deploy and verify.

## Prerequisites

- A visual-qa report must exist (either in the current issue thread or provided as input).
- User may provide additional focus points as parameters — these take priority.

## Procedure

### 1. Invoke frontend-design

Use [/frontend-design](skill://c150f394-1353-4ba9-bf7f-85f3b36ff431?s=frontend-design) to load the design quality reference before making any code changes.

### 2. Triage findings

1. Read the visual-qa report from the issue thread.
2. Read any additional user-provided focus points (passed as skill arguments or in the issue comments).
3. Prioritize: `critical` → `major` → `minor`. User focus points override default priority.
4. Group related fixes (e.g., all button fixes together, all spacing fixes together).

### 3. Fix the code

For each finding, in priority order:

1. Locate the relevant component/file in the codebase.
2. Make the minimal change to align with the DS / prototype.
3. Verify the fix doesn't regress other components (check related styles, shared variables).
4. Commit each logical group of fixes separately with a clear message.

**Rules for fixing:**
- Match the DS exactly — don't improvise design decisions.
- Preserve existing functionality — only change what the report identified.
- Use CSS modules / existing style patterns. Don't introduce new styling approaches.
- If a finding requires a design decision (ambiguous DS reference), note it and skip — escalate to the user.

### 4. Request code review

After all fixes are committed:

Use [/requesting-code-review](skill://233c1325-61f0-4d42-92eb-18f57d3816e3?s=requesting-code-review) to submit the changes for review.

Address any review feedback and re-commit as needed.

### 5. Deploy

After code review is approved:

Use [/bump-markup-version](skill://d9978923-185e-444f-b41c-433e271c0a76?s=bump-markup-version) with the project environment variables from the [Markup project configuration](https://paperclip-r7fv.srv1650819.hstgr.cloud/MARA/projects/markup/configuration) to deploy the updated version.

### 6. Re-run visual-qa

After deployment is confirmed healthy:

Use [/visual-qa](skill://visual-qa?s=visual-qa) to perform a fresh round of visual QA against the newly deployed version.

Post the final verification report on the issue.

## Output

The final issue comment should include:

1. **Fixes applied** — list of what was changed, grouped by component/area.
2. **Code review result** — approved / changes requested.
3. **Deployment status** — healthy / failed.
4. **Final visual-qa report** — the re-run results showing resolved vs remaining issues.

## Rules

- **Do not skip code review.** Every fix must go through `/requesting-code-review`.
- **Do not skip deployment verification.** Always re-run visual-qa after deploy.
- **Do not improvise design.** If the DS is ambiguous, escalate rather than guess.
- **Do not delegate.** Perform all fixes directly.
