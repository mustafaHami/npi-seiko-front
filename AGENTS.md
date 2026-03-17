# Repository Guidelines

## Project Structure & Module Organization
- Main app code lives in `src/app`.
- Feature pages are under `src/app/pages` (for example `dashboard`, `cost-request`, `engineering`).
- Shared UI and logic are grouped in `src/app/components`, `src/app/services`, `src/app/repositories`, `src/app/pipes`, and `src/app/directives`.
- Global and component styling is in `src/styles.scss` and `src/app/styles`.
- Runtime/static assets are in `src/assets`; environment variants are in `src/environments`.
- API client generation config is in `openapi-config/`; deployment configs and scripts are in `deployment/`, `Dockerfile*`, and `deploy-image.sh`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run openapi-ts`: regenerate API types/clients from the OpenAPI config. Run this before local dev or release builds when the API spec changes.
- `npm start`: run Angular dev server (`http://localhost:4205`).
- `npm run debug`: run dev server with explicit `development` configuration.
- `npm run build`: production build to `dist/npi-seiko-front`.
- `npm test`: run unit tests with Karma/Jasmine.

## Coding Style & Naming Conventions
- Use TypeScript + SCSS and follow Angular file naming: `*.component.ts|html|scss`, `*.service.ts`, `*.repo.ts`, `*.routes.ts`.
- Keep classes and enums in `PascalCase`; variables/functions in `camelCase`; constants in `UPPER_SNAKE_CASE` when truly constant.
- Prefer small, feature-focused modules and place related files together (page, route file, and supporting services).
- Prettier is available in the project; keep formatting consistent with surrounding files before committing.

## Testing Guidelines
- Framework: Jasmine with Karma (`@angular/build:karma`).
- Place tests next to source files as `*.spec.ts`.
- Current repository coverage is limited; add tests for each new feature or bug fix.
- Prioritize tests for route guards, repositories, and services that handle API/error flows.
- Run `npm test` before opening a PR; include regression tests for bug fixes.

## Commit & Pull Request Guidelines
- Follow the repository’s existing commit style: short, imperative messages (examples: `fix style`, `add shipping cost in breakdown view`).
- Keep commits focused to one logical change.
- PRs should include a clear summary of behavior changes and a linked issue/ticket.
- Add screenshots or GIFs for UI changes.
- Note environment/config updates and OpenAPI regeneration when applicable.

## Security & Configuration Tips
- Do not commit secrets in `src/environments` or deployment JSON files.
- Verify environment replacements (`development`, `demo`, `sandbox`, `production`) before building images or deploying.
