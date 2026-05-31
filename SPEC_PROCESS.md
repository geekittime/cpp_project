# ShipCheck Specification Process

## Context

This document records how ShipCheck moved from a broad final-project request to an implementable specification. The primary agent is OpenAI Codex App. Superpowers `5.1.0` was installed for Claude Code from `superpowers@superpowers-marketplace` and its workflow was followed explicitly in the Codex session. Open Design was inspected at commit `53fb175855e3e9b599353c4a48966f7022a05bc4`.

## Brainstorming Timeline

### Iteration 1: Pick A Real Small Problem

**Agent question:** Should the final project use ShipCheck, a software delivery checklist platform, as its formal topic?

**Human answer:** Confirmed.

**Impact:** The project stopped being a generic demonstration dashboard. It became a tool with a clear user and a thirty-second explanation: identify what still blocks delivery of a repository.

### Iteration 2: Decide Whether Audits Are Real

**Agent question:** Should the first version call GitHub's API for public repositories or only demonstrate the flow with sample data?

**Human answer:** Use the real API.

**Impact:** This decision introduced meaningful error paths: missing repositories, upstream failures, rate limits, empty repositories, and truncated trees. The specification now treats these as product behavior rather than incidental implementation details.

### Iteration 3: Resolve Optional Decisions Without Scope Drift

**Agent question:** Should the first version allow custom templates?

**Human answer:** The agent may choose whichever options are easier to implement.

**Agent decision:** Ship one protected built-in AI4SE template and allow copy-then-edit custom templates. Use a local single-user application without login. Use an optional GitHub token. Use an Open Design `dashboard` skill and `linear-app` design system.

**Impact:** The selected design has reusable product value without adding authentication, cloud database, or arbitrary rule scripting.

## Alternatives Considered

| Approach | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| Fixed CLI audit script | Lowest implementation cost | Weak evidence of product design; no history or manual evidence | Rejected |
| Local-first web dashboard | Real workflow, bounded infrastructure, testable modules | Requires UI and persistence | Selected |
| Multi-user SaaS | Rich deployment story | Authentication, database hosting, and workers distract from core value | Rejected |

## Adopted AI Suggestions

- Use a repository readiness product because the problem is concrete and aligned with the course.
- Keep authentication out of version 1.
- Evaluate repository contents through GitHub's API instead of cloning and executing untrusted code.
- Persist immutable report snapshots so progress remains auditable.
- Limit template automation to a small set of explicit rules.

## Modified Or Rejected Suggestions

- The first concept used React, Vite, FastAPI, and Python. Toolchain inspection showed Python and Docker were unavailable locally. The implementation was simplified to Node.js 24, Express, native SQLite, static browser JavaScript, and `npm` scripts.
- A fixed AI4SE-only template would be easiest, but it was expanded to copy-then-edit custom templates because this adds product value with limited risk.
- Cloud deployment is not treated as mandatory because the assignment marks it optional and a local-first SQLite service should not be exposed casually.

## Open Design Decision

The course handout described an older Open Design inventory. The inspected README at commit `53fb175855e3e9b599353c4a48966f7022a05bc4` lists `137` skills and `150` design systems. ShipCheck will use the `dashboard` skill and `linear-app` system as design references.

## Cold-Start Validation

### Required Different-Agent Attempt

A fresh non-persistent Claude Code session was started in the isolated `validation/coldstart-claude` worktree with instructions to read only `SPEC.md` and `PLAN.md`, stop on uncertainty, and attempt Task 1 with TDD. Claude Code was installed and authenticated, but the provider returned:

```text
401 quota exhausted
```

This is an external provider limitation. It prevents completion of the rubric's strict different-agent implementation run on this machine. The limitation is recorded instead of being hidden.

### Isolated Fallback Pressure Test

A fresh non-persistent Codex CLI session was then started in the same isolated worktree with the same document-only constraint. This fallback is useful specification evidence, but it does **not** fully satisfy the "different agent type" requirement because the primary session also uses Codex.

The fallback worker stopped before editing and asked:

1. What exact ordered checklist items should seed `AI4SE Final Project`?
2. Should `src/config.js` and `src/domain/errors.js` be created as empty/minimal modules in Task 1, or deferred until behavior requires them?

After those fixes, a second fresh fallback worker stopped again and asked:

1. What exact `title` and `description` strings should be seeded for each built-in checklist item?
2. Should it proceed with direct strict TDD because the isolated CLI did not load the named Superpowers skills?

### Defects Exposed

- `SPEC.md` described valid checklist item shapes but failed to enumerate the protected built-in template.
- `PLAN.md` listed two files too early, inviting empty placeholder modules and inconsistent agent interpretations.
- The built-in checklist still allowed inconsistent user-facing copy between implementations.
- The isolated fallback harness needed an explicit rule for direct TDD when its skill loader did not expose Superpowers.

### Key Revision Diff

```diff
+ The built-in AI4SE Final Project template contains these ordered items:
+ readme, docker, ci-workflow, repository-description, spec-document,
+ plan-document, cold-start-validation, agent-log, public-image, reflection

 Task 1 files:
- src/config.js
- src/domain/errors.js
+ src/db/database.js
+ src/db/migrate.js

+ Task 2 creates src/domain/errors.js when domain validation first needs it.
+ Task 9 creates src/config.js when server environment parsing is tested.
+
+ Each built-in item now has an exact title and description.
+ Isolated fallback workers use direct strict TDD if Superpowers skills cannot load.
```

The revised documents remove both ambiguities. A later submission still needs one successful fresh Claude Code, Cursor, Gemini CLI, OpenCode, or Qwen Code implementation run after provider quota is available.

### Successful Fallback Trial

After the second revision, a third fresh non-persistent fallback worker found no unanswered questions and implemented Task 1 using direct strict TDD:

```text
RED: Cannot find module '../../src/db/migrate'
GREEN: targeted test passed, full npm test passed
commit: 944201316116200f8b64dbbeca7df8f6b04430a4
```

The primary session then performed the required two-stage review. Spec compliance passed. Code quality review found that schema DDL occurred outside the seed transaction and that `INSERT OR IGNORE` silently preserved drifted built-in rows. Tests were added first to reproduce both issues, then commit `5c0ea21` made schema initialization transactional, replaced ignores with canonical upserts, removed obsolete seed items, and recorded `PRAGMA user_version = 1`.

The fallback implementation proves that the revised documents are executable without hidden conversational context. The strict rubric deviation remains: the successful fallback worker was Codex CLI because the available Claude Code provider had no quota.

## Reflection On Brainstorming

The strongest part of Superpowers brainstorming is its implementation gate. It forced product scope, error handling, and runtime constraints to be decided before scaffolding. The awkward part is that its ideal question-by-question rhythm can become ceremonial when the human explicitly delegates low-risk choices. In this project, delegated decisions are recorded with reasons instead of prompting for approval on every small option.
