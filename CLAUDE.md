# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 21 application for **NPI (New Product Introduction) workflow management** (Seiko NPI Front). This app is the
step after quotation — once a quotation is approved, an NPI order is created and tracked through its full lifecycle.

### Business Context

The NPI workflow covers the full journey from order creation to customer approval:

1. **Order creation** — PO number, work order ID, part number, quantity, target delivery date, customer, product
2. **Process tracking** — Each NPI order has a `ProcessInstance` with multiple `ProcessInstanceLine` steps (e.g.
   material purchasing, manufacturing, testing, shipping, validation)
3. **Stage status management** — Each process line transitions through: `NOT_STARTED → IN_PROGRESS → COMPLETED`
   (or `ABORTED`)
4. **File management** — Documents can be attached to NPI orders and to individual process lines (e.g. validation docs)
5. **Shipping & customer approval** — Shipping date and customer approval/rejection are recorded on the order
6. **Archiving & aborting** — Orders can be archived or aborted (freezes all related data)

### Dashboards

- Open NPI projects count and average lead time
- NPI order count by stage/status (`DashboardNpiOrderCountByStageStatus`)

### NPI Order Statuses

`READY_TO_PRODUCTION` → `STARTED` → `COMPLETED` | `ABORTED`

### Roles

`ADMINISTRATOR`, `SUPER_ADMINISTRATOR`, `PROJECT_MANAGER`, `ENGINEERING`, `PROCUREMENT`, `PLANNING`, `MANAGEMENT`

### Tech Stack

Uses standalone components, PrimeNG UI library, and OpenAPI-generated API clients (from `swagger-npi-seiko.yaml`).

## MANDATORY ::ng-deep

**Don't use `::ng-deep`** in any stylesheet. It is deprecated. For global styles (`styles.scss`), target PrimeNG classes
directly (e.g., `.p-card`, `.p-button`). For component styles, use `ViewEncapsulation.None` only if truly needed, or
move the styles to a global stylesheet.

## ⚠️ MANDATORY: Code Language Requirements

**ALL code, comments, and git commits MUST be in English.**

This is a client requirement and must be strictly enforced:

- All method names in English
- All variable and attribute names in English
- All code comments in English
- All commit messages in English
- All documentation in English

This applies to all new code and modifications. No exceptions.

## 📚 Detailed Documentation (Skills)

The complete coding standards and best practices are organized in separate skill files in `.claude/skills/`. Use these
skills for detailed guidance:

### Core Patterns

- **angular-modern-patterns/SKILL.md** - Angular 21+ component structure, control flow syntax, template bindings
- **signals-reactive-state/SKILL.md** - Signal basics, inputs/outputs, when to use signals vs observables
- **dependency-injection/SKILL.md** - Using inject() function (REQUIRED pattern)
- **observable-management/SKILL.md** - takeUntilDestroyed, async pipe, debouncing, error handling

### Code Standards

- **typescript-standards/SKILL.md** - Explicit typing, enums, naming conventions
- **repository-pattern/SKILL.md** - API calls through repositories (REQUIRED pattern)
- **forms/SKILL.md** - Reactive forms with enums, validation, form utilities
- **performance-change-detection/SKILL.md** - OnPush change detection (REQUIRED), trackBy, optimization
- **accessibility/SKILL.md** - WCAG AA standards, ARIA attributes (MANDATORY)

### Architecture & Services

- **architecture-overview/SKILL.md** - Routing system, security, component organization, file structure
- **service-patterns/SKILL.md** - Modal service, toast service, loader service, config service
- **api-integration/SKILL.md** - OpenAPI configuration, client generation, fromRequest utility
- **styling/SKILL.md** - SCSS structure, PrimeNG theming, BEM naming convention

### Development

- **development-commands/SKILL.md** - npm scripts, build configs, Docker deployment, initialization flow
- **common-patterns/SKILL.md** - Lazy loading, search, pagination, CRUD operations, modals, confirmations

### API-first workflow (MANDATORY)

- **api-first-openapi-workflow/SKILL.md** - Reference API specification, and creation of API clients details if apis not
  exists

## Quick Reference

### Component Template (REQUIRED)

```typescript
@Component({
  selector: "app-my-component",
  imports: [CommonModule, FormsModule],
  templateUrl: "./my-component.component.html",
  styleUrl: "./my-component.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush, // REQUIRED
})
export class MyComponent {
  // Use inject() instead of constructor injection
  private userRepo = inject(UserRepo);
  private destroyRef = inject(DestroyRef);

  // Signal-based inputs/outputs for new components
  userId = input.required<string>();
  onUpdate = output<User>();

  // Signals for component state
  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);

  // Computed for derived state
  userCount = computed(() => this.users().length);
}
```

### Template Syntax (REQUIRED)

```html
<!-- New control flow syntax -->
@if (isLoading()) {
<app-loader />
} @else { @for (user of users(); track user.uid) {
<app-user-card [user]="user" />
} }
```

### Observable Cleanup (REQUIRED)

```typescript
ngOnInit();
{
  this.dataService
    .getData()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((data) => {
      // Handle data
    });
}
```

## Development Commands

```bash
# Initial setup
npm install
npm run openapi-ts

# Development
npm run debug        # Dev server on port 4205 (development config)
npm start            # Dev server (production config)
npm run build        # Production build
npm test             # Run tests

# API client generation
npm run openapi-ts   # Regenerate from swagger-npi-seiko.yaml
```

## Key Files

- `src/app/app.routes.ts` - Main application routes
- `src/app/app.config.ts` - Application configuration
- `src/app/security/authentication.service.ts` - Authentication
- `src/app/services/Access.service.ts` - Role-based access control
- `src/app/configs/interceptors/` - HTTP interceptors
- `src/environments/routes.environment.ts` - Route definitions

## Important Reminders

- ✅ **All components MUST use OnPush change detection**
- ✅ **Always use inject() instead of constructor injection**
- ✅ **Use signal inputs/outputs for new components**
- ✅ **Use new @if, @for, @switch syntax (not *ngIf, *ngFor)**
- ✅ **All API calls MUST go through repositories**
- ✅ **Create enums for form field names**
- ✅ **Use takeUntilDestroyed for subscriptions**
- ✅ **All code and comments MUST be in English**
- ✅ **All components MUST pass AXE accessibility checks**

For detailed examples and complete specifications, refer to the skill files in `.claude/skills/`.
