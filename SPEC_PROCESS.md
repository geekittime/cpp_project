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

This section will be completed after `PLAN.md` exists and a fresh Claude Code session receives only `SPEC.md` and `PLAN.md`.

## Reflection On Brainstorming

The strongest part of Superpowers brainstorming is its implementation gate. It forced product scope, error handling, and runtime constraints to be decided before scaffolding. The awkward part is that its ideal question-by-question rhythm can become ceremonial when the human explicitly delegates low-risk choices. In this project, delegated decisions are recorded with reasons instead of prompting for approval on every small option.

