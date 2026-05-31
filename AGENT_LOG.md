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
