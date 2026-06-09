# Agent Log

## 2026-05-31T00:00:00+08:00 - Discovery

- **Task:** `DISCOVERY-01`
- **Skills:** `brainstorming`
- **Context:** Read the course handout, confirmed the workspace was empty, and inspected local commands.
- **Key findings:** Node.js `24.14.0`, npm `11.9.0`, Codex CLI `0.128.0`, and Claude Code `2.1.91` are available. Python resolves only to the Microsoft Store shim. Docker, `gh`, Gemini CLI, and `make` are unavailable.
- **Human intervention:** The user requested full completion and delegated low-risk implementation choices to the agent.
- **Lesson:** Inspect the real toolchain before locking a stack. A single Node runtime removes avoidable setup risk.

## 2026-05-31T00:10:00+08:00 - Superpowers Installation

- **Task:** `DISCOVERY-02`
- **Skills:** `brainstorming`
- **Context:** Cloned `obra/superpowers`, read the official workflow skills, registered `obra/superpowers-marketplace`, and installed `superpowers@superpowers-marketplace` for Claude Code user scope.
- **Key output:** Superpowers plugin version `5.1.0` enabled in Claude Code.
- **Human intervention:** None.
- **Lesson:** The Codex App marketplace is UI-driven. Installing the official Claude plugin provides verifiable local installation evidence while the Codex session follows the same checked-in skill instructions explicitly.

## 2026-05-31T00:20:00+08:00 - Open Design Selection

- **Task:** `DISCOVERY-03`
- **Skills:** `brainstorming`
- **Context:** Inspected `nexu-io/open-design` at commit `53fb175855e3e9b599353c4a48966f7022a05bc4`.
- **Key output:** Selected `dashboard` skill and `linear-app` design system. Current README reports `137` skills and `150` systems.
- **Human intervention:** User delegated design choices.
- **Lesson:** Pin fast-moving design references by commit and record where the design language came from.

## 2026-05-31T00:30:00+08:00 - Specification

- **Task:** `SPEC-01`
- **Skills:** `brainstorming`
- **Context:** Converted the selected ShipCheck concept into a bounded local-first specification.
- **Key prompt strategy:** Ask about decisions that materially change architecture; make conservative decisions and record reasons when the user delegates smaller choices.
- **Human intervention:** User confirmed ShipCheck and real GitHub API auditing.
- **Lesson:** Treat upstream error mapping and explicit omissions as part of the product, not cleanup work.

## 2026-05-31T00:45:00+08:00 - Implementation Plan

- **Task:** `PLAN-01`
- **Skills:** `writing-plans`
- **Context:** Converted the approved specification into ten TDD tasks with exact file ownership, dependency ordering, worktree groups, failing-test expectations, and verification commands.
- **Key prompt strategy:** Each behavior task starts with a test that fails for a named missing capability. Configuration-only files are added beside the behavior that exercises them.
- **Human intervention:** The user delegated low-risk choices and requested continuous completion.
- **Lesson:** Plan around independently testable boundaries first; assign worktrees only after boundaries are explicit.

## 2026-05-31T01:00:00+08:00 - Cold-Start Specification Validation

- **Task:** `COLDSTART-01`
- **Skills:** `using-git-worktrees`, `test-driven-development`
- **Context:** Created `validation/coldstart-claude`. A fresh Claude Code session received only `SPEC.md` and `PLAN.md`, but its provider returned `401 quota exhausted`. A fresh non-persistent Codex CLI fallback session received the same restricted context.
- **Key output:** The fallback worker stopped before editing and asked for the exact built-in checklist items and the intended timing of `src/config.js` and `src/domain/errors.js`.
- **Human intervention:** None. The documents were revised to enumerate ten built-in items and move files to their first behavior-owning tasks.
- **Deviation:** The successful pressure test used the same agent type as the primary session. A strict different-agent retry remains necessary when Claude Code provider quota is restored.
- **Lesson:** If a worker asks whether to create an empty module, the plan has probably assigned the file too early.

## 2026-05-31T01:15:00+08:00 - Cold-Start Specification Validation Round 2

- **Task:** `COLDSTART-02`
- **Skills:** `test-driven-development`
- **Context:** A second fresh non-persistent fallback worker retried Task 1 using only the revised `SPEC.md` and `PLAN.md`.
- **Key output:** It requested canonical titles and descriptions for all built-in items and asked how to proceed when Superpowers skills were absent from the isolated CLI.
- **Human intervention:** None. The specification now fixes user-facing seed copy and the plan instructs isolated validation workers to use direct strict TDD when skill loading is unavailable.
- **Lesson:** Exact seed fixtures belong in the specification when later UI and tests expose their text.

## 2026-05-31T01:30:00+08:00 - Cold-Start Task 1 Trial

- **Task:** `TASK-01`
- **Skills:** `using-git-worktrees`, `test-driven-development`, `requesting-code-review`
- **Context:** A third fresh non-persistent Codex CLI fallback worker read only `SPEC.md` and `PLAN.md`, implemented Task 1, and committed `9442013`.
- **RED evidence:** `Cannot find module '../../src/db/migrate'`.
- **GREEN evidence:** Targeted migration test passed, then the full suite passed.
- **Review:** Spec compliance approved. Code quality review requested transactional DDL, canonical seed repair, full fixture assertions, narrow test discovery, and a migration version marker.
- **Human intervention:** Added failing rollback and drift tests, then fixed migration behavior in `5c0ea21`. Merged the reviewed branch into `main` with `43af5fd`.
- **Lesson:** Two-stage review caught recovery bugs that a happy-path baseline could not expose. Immutable built-in fixtures need repair semantics, not silent ignore semantics.

## 2026-05-31T02:10:00+08:00 - Template API Merge

- **Task:** `TASK-03`
- **Skills:** `test-driven-development`, `requesting-code-review`
- **Context:** Implemented template persistence and routes in an isolated worktree, then reviewed payload shape and validation ordering.
- **Key output:** `f4ea6dd` introduced the API, `57f8915` fixed review findings, and `678800d` merged the branch.
- **Human intervention:** Tightened route behavior so identity checks happen before invalid payload validation where the spec required it.
- **Lesson:** API tests are especially good at catching order-of-operations mistakes that look harmless in local code.

## 2026-05-31T02:45:00+08:00 - Domain Rules Merge

- **Task:** `TASK-02`
- **Skills:** `test-driven-development`, `requesting-code-review`
- **Context:** Built URL normalization, template validation, automated rule evaluation, and report scoring in a dedicated worktree.
- **Key output:** `ac1ee18` implemented the domain layer, `4008acc` hardened GitHub URL parsing and typed audit rules, and `6ed392c` merged the reviewed branch.
- **Human intervention:** Updated `PLAN.md` in `ad2631c` after review revealed one misleading validation note.
- **Lesson:** The domain layer became the easiest place to keep product rules explicit instead of burying them in HTTP handlers.

## 2026-06-01T09:30:00+08:00 - Runtime Completion

- **Task:** `TASK-04` to `TASK-09`
- **Skills:** `test-driven-development`, `requesting-code-review`, `systematic-debugging`
- **Context:** Completed projects, GitHub client behavior, immutable reports, manual evidence, health endpoint, dashboard assets, runtime config, server startup, Docker, and CI.
- **Key output:** Local commit `ffee762` added 27 files and finalized the runnable application.
- **Prompt strategy:** Keep each capability observable through either an HTTP integration test or a focused unit test before adding implementation.
- **Human intervention:** Fixed one cross-platform config mismatch when `DATABASE_PATH` defaulted to backslashes on Windows instead of the forward-slash path promised in the spec.
- **Lesson:** The built-in test runner plus ephemeral SQLite databases were enough to keep the app honest without adding another framework.

## 2026-06-01T09:45:00+08:00 - Dashboard Self-Critique

- **Task:** `TASK-08-REVIEW`
- **Skills:** `requesting-code-review`
- **Context:** Reviewed the static dashboard against the Open Design `dashboard` and `linear-app` cues named in the spec.
- **Findings:** Hierarchy, focus states, contrast, loading states, empty states, and responsive collapse are present. The template editor is intentionally utilitarian and exposes raw JSON instead of a richer visual builder.
- **Human intervention:** Kept the JSON editor because it preserves scope and still demonstrates editable templates without a second wave of frontend complexity.
- **Lesson:** A plain but coherent interface is better evidence than an overbuilt UI with weak behavior underneath.

## 2026-06-01T09:55:00+08:00 - Final Verification

- **Task:** `TASK-10`
- **Skills:** `requesting-code-review`
- **Context:** Ran `npm test`, `npm run test:coverage`, and `npm start`, then requested `GET /api/health`.
- **Key output:** `40` tests passed, overall coverage reached `92.76%` lines, and the live health check returned `{"status":"ok"}`.
- **Review summary:** No critical defects remained. Residual risk is external: no Docker binary in the workstation, no GitHub remote, and no container registry credentials.
- **Lesson:** By the end, the remaining gaps were delivery-channel constraints rather than missing local software behavior.

## 2026-06-01T10:00:00+08:00 - External Limitations

- **Task:** `DELIVERY-EXTERNAL`
- **Skills:** `finishing-a-development-branch`
- **Context:** Compared the local workspace against the course deliverable checklist.
- **Blocked items:** public GitHub PR history, public Docker Hub or GHCR image URL, and optional public deployment URL.
- **Reason:** This workspace has no configured GitHub remote, no registry credentials, and no cloud deployment account secrets.
- **Lesson:** Agentic workflows can fully prepare local artifacts, but public publication still depends on human-controlled infrastructure access.

## 2026-06-01T10:10:00+08:00 - Different-Agent Retry

- **Task:** `COLDSTART-RETRY`
- **Skills:** `finishing-a-development-branch`
- **Context:** Retried a minimal non-interactive Claude Code invocation to see whether the earlier different-agent cold-start requirement could be completed after the rest of the project stabilized.
- **Key output:** `claude --version` returned `2.1.91`, but a non-interactive `claude -p` probe did not complete within the local timeout window.
- **Human intervention:** Recorded the retry result instead of overstating compliance.
- **Lesson:** Tool availability and successful provider execution are separate things; the rubric gap remains external, not hidden.

## 2026-06-09T10:20:00+08:00 - Remote Publication

- **Task:** `DELIVERY-REMOTE`
- **Skills:** `finishing-a-development-branch`
- **Context:** Checked GitHub connectivity again and found an authenticated user profile plus multiple owned public repositories, including the empty repository `geekittime/cpp_project`.
- **Key output:** Published the local git history to `https://github.com/geekittime/cpp_project` and preserved review branches: `archive/task1-baseline`, `feature/template-api`, `feature/domain-rules`, `feature/runtime-dashboard`, and `docs/delivery-evidence`.
- **Human intervention:** Promoted the final project state to remote `main` after first preserving the Task 1 baseline on its own archival branch.
- **Lesson:** Even when local implementation is finished, packaging the history for external review is a separate engineering task.

## 2026-06-09T10:30:00+08:00 - PR Creation Limitation

- **Task:** `DELIVERY-PRS`
- **Skills:** `finishing-a-development-branch`
- **Context:** Attempted to create GitHub pull requests through the installed GitHub integration after pushing feature branches.
- **Key output:** Every PR creation attempt failed with `403 Resource not accessible by integration`.
- **Human intervention:** Kept the pushed review branches and documented the exact permission failure instead of fabricating PR evidence.
- **Lesson:** Published branches can be automated with local git credentials, but PR creation still depends on the permission scope of the installed GitHub integration or a separate authenticated CLI.
