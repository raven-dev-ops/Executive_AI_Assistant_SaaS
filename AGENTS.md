# AGENTS.md (Codex 5.2)

These instructions apply to Codex 5.2 agents working in this repo.

## Core expectations
- Work tracking: every improvement must be a GitHub issue. Use parent issues with sub-issues/tasks and always set priority, tags/labels, and milestone.
- Documentation: update docs for any new feature or change (README, WIKI.md, CHANGELOG.md, docs/, RELEASES.md as applicable).
- Versioning: bump versions for release-impacting changes and keep release notes in sync.
- CI/CD: keep Playwright updates current in the CI/CD pipeline when versions change.
- Secrets: never hardcode secrets; use `.env` files and the secret manager only.
- Access/tooling: you have full access and can use Google Cloud SDK and GitHub CLI for GitHub access.
- Reference: consult `Project_Engineering_Whitepaper.pdf` in the repo root for architecture/process decisions or when unsure.

## Scope definitions
- "Improvement" includes: bugfixes, refactors, dependency changes, documentation changes, CI/CD or tooling changes, performance work, and security hardening.
- If a request is ambiguous, clarify scope before starting work.

## Issue discipline
- If an issue does not exist for requested work, create it before implementation.
- Break work into sub-issues/tasks where helpful and keep scope and priorities clear.
- Tag issues consistently and set a milestone for every improvement.
  - Priority scale:
    - P0: production down, critical security incident, or data loss; immediate response.
    - P1: major user impact or blocked workflows; next release or hotfix.
    - P2: moderate impact or important improvement; schedule soon.
    - P3: low impact or cleanup; backlog when capacity allows.
  - Labels (use at least one from each group):
    - Type: `type:bug`, `type:feature`, `type:enhancement`, `type:chore`, `type:docs`, `type:security`, `type:infra`, `type:ci`, `type:refactor`.
    - Area: `area:backend`, `area:frontend`, `area:dashboard`, `area:chat`, `area:widget`, `area:ops`, `area:k8s`, `area:shared`, `area:docs`.
    - Status (as needed): `status:blocked`, `status:needs-info`, `status:ready`, `status:in-progress`, `status:review`.
  - Milestones: use monthly release cadence `YYYY.MM` (example: `2026.01`); use `Hotfix-YYYY.MM.DD` for urgent patches.

## PR workflow (required)
- Create a feature branch per issue (example: `issue-159-pr-workflow`).
- Commit changes with a message that references the issue.
- Push the branch to the remote and open a PR via GitHub CLI.
- Ensure the PR links all relevant issues, includes labels/milestone, and is marked ready for review.
- Do not push directly to `main`; all changes must go through a PR.

## Definition of done
- Code changes landed and reviewed (if applicable).
- Tests updated/added for behavior changes; CI passes.
- Run advanced QL tests and the build test (or ensure CI runs them) before closing the issue.
- Docs updated where applicable (README, WIKI.md, CHANGELOG.md, docs/, RELEASES.md).
- Version bump applied when behavior, APIs, or dependencies change.
- Issue updated with final status and release notes context if needed.

## Documentation and release hygiene
- Update documentation alongside code changes, not after the fact.
- Update version numbers and release notes when behavior, APIs, or dependencies change.
- Ensure the changelog reflects user-visible impact, not just internal refactors.

## Versioning locations
- Update the relevant manifest(s) for this repo (for example: `package.json`, `pyproject.toml`, backend service version files, release metadata).
- If version files are unclear, locate them before making release-impacting changes and note them in the issue.

## CI/CD and Playwright updates
- When Playwright version changes, update CI/CD pipelines, caches, and any pinned browser/download steps.
- Keep the test matrix and lockfiles aligned with the Playwright version.

## Architecture and cross-service changes
- Consult `Project_Engineering_Whitepaper.pdf` before major architecture, data model, or cross-service changes.

## Security and secret handling
- Treat `.env` files and the secret manager as the only allowed secret sources.
- Remove any accidental secret from code or logs immediately and rotate if exposed.
