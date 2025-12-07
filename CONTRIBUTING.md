# Contributing Guide

Welcome! We follow a strict workflow to ensure high-quality, automated releases.

## Workflow & Branching Strategy

We use **Semantic Release** to automate version management and package publishing.

| Branch | Role | Release Type | Version Example |
| :--- | :--- | :--- | :--- |
| `main` | **Production** | Official Release | `v1.2.0` |
| `beta` | **Beta Testing** | Pre-release | `v1.2.0-beta.1` |
| `develop` | **Development** | Dev Pre-release | `v1.2.0-dev.1` |

### How to contribute:
1.  Checking out a new branch from `develop`.
2.  Make your changes.
3.  Create a Pull Request (PR) to `develop` (or `beta`/`main` depending on urgency).
4.  Once merged, the CI/CD pipeline will automatically publish a new version.

## Commit Message Convention

We follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification. This is **REQUIRED** for the automated release system to work.

**Format:** `<type>(<scope>): <subject>`

### Common Types:

| Type | Description | Version Bump |
| :--- | :--- | :--- |
| `feat` | A new feature | **Minor** (`1.1.0`) |
| `fix` | A bug fix | **Patch** (`1.0.1`) |
| `perf` | Performance improvement | **Patch** (`1.0.1`) |
| `docs` | Documentation only | No release |
| `chore` | Maintenance, dependencies | No release |
| `refactor`| Code change that neither fixes a bug nor adds a feature | No release |

### Breaking Changes

To trigger a **Major** release (`2.0.0`), add `BREAKING CHANGE:` in the footer or append `!` after the type/scope.

**Example:**
```text
feat(api)!: change default port to 8080

BREAKING CHANGE: The default port has been changed from 3000 to 8080.
```

## Setup & Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run lint
npm run lint
```
