# ShipCheck

ShipCheck is a local-first delivery readiness dashboard for public GitHub repositories. It combines a protected AI4SE final-project checklist, copyable custom templates, real GitHub API audits, manual evidence tracking, and immutable report snapshots so a student or solo developer can see what still blocks release or submission.

## Features

- Register, edit, list, and delete tracked GitHub repositories.
- Audit public repositories with real GitHub REST metadata and tree lookups.
- Score delivery readiness and separate `ready` from `blocked`.
- Store immutable report history per project.
- Record manual evidence for checklist items that cannot be automated.
- Copy the built-in AI4SE template into custom editable templates.
- Serve a dark dashboard UI informed by Open Design `dashboard` + `linear-app`.

## Tech Stack

- Node.js 24
- Express 5
- Native `node:sqlite`
- Native `fetch`
- Node built-in test runner
- Static HTML, CSS, and browser JavaScript
- Docker
- GitHub Actions

## Requirements

- Node.js `>= 24`
- npm `>= 11`
- Optional: `GITHUB_TOKEN` for higher GitHub API rate limits

## Local Development

Install dependencies:

```bash
npm ci
```

Start the app:

```bash
npm start
```

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Health check:

```bash
curl http://127.0.0.1:3000/api/health
```

## Environment Variables

| Name | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `DATABASE_PATH` | `data/shipcheck.sqlite` | SQLite file path |
| `GITHUB_TOKEN` | empty | Optional GitHub bearer token |

## Docker

Build:

```bash
docker build -t shipcheck:local .
```

Run:

```bash
docker run --rm -p 3000:3000 -v shipcheck-data:/app/data shipcheck:local
```

The image stores SQLite data under `/app/data`.

## API Summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/templates` | List templates |
| `GET` | `/api/templates/:id` | Fetch template details |
| `POST` | `/api/templates/:id/copy` | Copy template |
| `PUT` | `/api/templates/:id` | Update custom template |
| `DELETE` | `/api/templates/:id` | Delete custom template |
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id` | Fetch project |
| `PUT` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |
| `PUT` | `/api/projects/:id/evidence/:itemKey` | Upsert manual evidence |
| `POST` | `/api/projects/:id/audits` | Run an audit |
| `GET` | `/api/projects/:id/reports` | List report summaries |
| `GET` | `/api/projects/:id/reports/:reportId` | Fetch one immutable report |

All error responses use the stable envelope below:

```json
{
  "error": {
    "code": "stable_code",
    "message": "Human-readable explanation",
    "details": {}
  }
}
```

## Directory Structure

```text
src/
  app.js
  config.js
  server.js
  public/
  db/
  domain/
  repositories/
  routes/
  services/
test/
docs/
SPEC.md
PLAN.md
SPEC_PROCESS.md
AGENT_LOG.md
REFLECTION.md
```

## Architecture Notes

- Express serves both JSON APIs and the static dashboard shell.
- SQLite persists templates, projects, evidence, and immutable reports.
- The audit service combines repository metadata, recursive tree data, and local manual evidence.
- The GitHub client never clones or executes repository code.

## GitHub API Behavior

- `404` maps to `github_repository_not_found`
- exhausted `403` maps to `github_rate_limited`
- network and `5xx` failures map to `github_unavailable`
- empty repositories return warnings rather than crashing the audit
- truncated repository trees are preserved as audit warnings

Without `GITHUB_TOKEN`, GitHub rate limits can block repeated audits.

## Open Design Attribution

This UI was shaped by Open Design repository commit `53fb175855e3e9b599353c4a48966f7022a05bc4`, using the `dashboard` skill and `linear-app` design system as references for hierarchy, density, focus states, and dark-surface tokens.

## Third-Party Software

- `express` - MIT
- Node.js runtime and standard library - Node.js license
- Open Design reference materials - Apache-2.0
- Superpowers methodology reference - see upstream repository license

## CI

GitHub Actions workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

The workflow runs:

1. `npm ci`
2. `npm test`
3. `docker build -t shipcheck:test .`

## Deployment Notes

ShipCheck is intentionally local-first. A cloud deployment URL was not configured in this workspace because no remote hosting account or secrets were available.

## Course Deliverable Status

Completed locally:

- `SPEC.md`
- `PLAN.md`
- `SPEC_PROCESS.md`
- application source code
- tests and coverage
- `Dockerfile`
- CI workflow
- `AGENT_LOG.md`
- `README.md`
- `REFLECTION.md` worksheet

Still blocked by external accounts or credentials:

- public GitHub remote with PR history
- public Docker Hub or GHCR image URL
- optional cloud deployment URL

Those gaps are documented explicitly in `AGENT_LOG.md` and `SPEC_PROCESS.md` instead of being hidden.
