# Angular 21+ Modern Patterns

Use this skill when working with Angular components, templates, and modern Angular 21+ syntax.

## Component Structure (REQUIRED)

**All components MUST follow this structure:**

```typescript
@Component({
  selector: "app-my-component",
  imports: [CommonModule, FormsModule, ButtonModule], // Direct imports
  templateUrl: "./my-component.component.html",
  styleUrl: "./my-component.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush, // REQUIRED for all components
  // ❌ DO NOT SET standalone: true - It's the default in Angular 20+
})
export class MyComponentComponent {
  // ✅ Use inject() function instead of constructor injection (REQUIRED)
  private userRepo = inject(UserRepo);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ✅ Signal-based inputs/outputs (REQUIRED for new code)
  userId = input.required<string>();
  onUpdate = output<User>();

  // ✅ Use signals for component state (RECOMMENDED)
  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);

  // ✅ Use computed() for derived state
  userCount = computed(() => this.users().length);
  hasUsers = computed(() => this.users().length > 0);

  // Explicit types for all properties
  private subscription?: Subscription;

  ngOnInit() {
    // ✅ Use takeUntilDestroyed for automatic cleanup (REQUIRED)
    this.userRepo
      .getUser(this.userId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.onUpdate.emit(user);
      });
  }
}
```

## ❌ FORBIDDEN PATTERNS

**NEVER use these deprecated patterns:**

```typescript
// ❌ BAD: Explicit standalone declaration (it's the default)
@Component({
  selector: "app-my-component",
  standalone: true, // REMOVE THIS
})

// ❌ BAD: Constructor injection
export class MyComponent {
  constructor(
    private userRepo: UserRepo,
    private router: Router,
  ) {
  }
}

// ❌ BAD: Old @Input/@Output decorators
@Input({ required: true })
userId!
:
string;
@Output()
onUpdate = new EventEmitter<User>();

// ❌ BAD: Using @HostBinding/@HostListener decorators
@HostListener('click', ['$event'])
handleClick(event
:
Event
)
{
}

@HostBinding('class.active')
isActive = true;

// ✅ GOOD: Use host property in @Component decorator
@Component({
  selector: "app-my-component",
  host: {
    '(click)': 'handleClick($event)',
    '[class.active]': 'isActive',
  }
})
```

## Control Flow Syntax (REQUIRED)

**Use new `@if`, `@for`, `@switch` syntax instead of `*ngIf`, `*ngFor`, etc.**

```html
<!-- ✅ GOOD: Native control flow syntax -->
@if (isLoading()) {
<app-loader />
} @else if (users().length > 0) { @for (user of users(); track user.uid) {
<app-user-card [user]="user" />
} } @else {
<p>No data</p>
} @switch (status) { @case ('active') { <span>Active</span> } @case ('inactive')
{ <span>Inactive</span> } @default { <span>Unknown</span> } }

<!-- ❌ BAD: Old structural directives -->
<app-loader *ngIf="isLoading" />
<app-user-card *ngFor="let user of users" [user]="user" />
<span *ngSwitch="status">
  <span *ngSwitchCase="'active'">Active</span>
</span>
```

## Template Bindings (REQUIRED)

**Use [class] and [style] bindings instead of ngClass/ngStyle:**

```html
<!-- ✅ GOOD: Use [class] and [style] bindings -->
<div
  [class.active]="isActive"
  [class]="'card ' + (isPrimary ? 'primary' : 'secondary')"
  [style.color]="textColor"
  [style.font-size.px]="fontSize"
>
  Content
</div>

<!-- ❌ BAD: ngClass and ngStyle directives -->
<div
  [ngClass]="{ active: isActive }"
  [ngStyle]="{ color: textColor, 'font-size': fontSize + 'px' }"
>
  Content
</div>

<!-- ✅ GOOD: NgOptimizedImage for static images -->
<img ngSrc="assets/logo.svg" alt="Logo" width="200" height="100" priority />

<!-- ❌ BAD: Regular img tag for static images -->
<img src="assets/logo.svg" alt="Logo" />
```

## Template Best Practices

**FORBIDDEN patterns in templates:**

```html
<!-- ❌ FORBIDDEN: Arrow functions in templates -->
<button (click)="items.filter(i => i.active)">Filter</button>

<!-- ✅ GOOD: Method reference -->
<p-button (onClick)="filterActive()">Filter</p-button>

<!-- ❌ FORBIDDEN: Direct use of global constructors -->
<span>{{ new Date() }}</span>

<!-- ✅ GOOD: Use component property -->
<span>{{ currentDate }}</span>
```

## Base Classes

**Extend base classes for common patterns:**

```typescript
// For dialogs
export class UserDialogComponent extends BaseModal {
  // Inherited: ref, formService, config, handleMessage, destroyRef
  // Use: this.closeDialog(result)
}

// For list pages
export class UsersListComponent extends BaseListComponent {
  // Inherited: loading, totalRecords, searchText, destroyRef
}
```

## PrimeNG Table Pattern (REQUIRED)

**All p-table components MUST follow this structure:**

```html
<p-table
  (onLazyLoad)="loadData($event)"
  [lazy]="true"
  [loading]="loading"
  [paginator]="true"
  [resizableColumns]="true"
  [rowsPerPageOptions]="rowsPerPageOptions"
  [rows]="maxRowDefault"
  [totalRecords]="totalRecords"
  [value]="items()"
  class="app-table"
  dataKey="uid"
>
  <ng-template pTemplate="caption">
    <div class="table-caption">
      <div class="caption-action-button">
        <app-search-input
          (eventSearchValidate)="activateSearch($event)"
        ></app-search-input>
      </div>
      <div class="caption-action-button">
        <p-button
          (onClick)="createItem()"
          [icon]="Icons.PLUS"
          [raised]="true"
          label="Item"
        ></p-button>
      </div>
    </div>
  </ng-template>

  <ng-template pTemplate="header">
    <tr>
      <th>{{ TableColsTitle.NAME }}</th>
      <th>{{ TableColsTitle.CODE }}</th>
      <th class="col-actions">{{ TableColsTitle.ACTIONS }}</th>
    </tr>
  </ng-template>

  <ng-template let-item pTemplate="body">
    <tr>
      <td>{{ item.name }}</td>
      <td>{{ item.code }}</td>
      <td class="col-actions">
        <p-button
          (onClick)="editItem(item)"
          [icon]="Icons.PENCIL"
          [text]="true"
          pTooltip="Edit"
          tooltipPosition="top"
        ></p-button>
        @if (item.active) {
        <p-button
          (onClick)="archiveItem(item)"
          [delay]="2000"
          [icon]="Icons.ARCHIVE"
          [text]="true"
          appNoDoubleClick
          pTooltip="Archive"
          severity="danger"
          tooltipPosition="top"
        ></p-button>
        }
      </td>
    </tr>
  </ng-template>

  <ng-template pTemplate="emptymessage">
    <tr class="p-datatable-emptymessage">
      <td colspan="10">No data</td>
    </tr>
  </ng-template>
</p-table>
```

### Key Table Rules

1. ✅ **ALWAYS** use `class="app-table"` on `<p-table>` elements
2. ✅ **ALWAYS** include an `emptymessage` template
3. ✅ **ALWAYS** use `class="col-actions"` for action columns
4. ✅ **ALWAYS** use `class="col-center"` for centered columns (like checkboxes)

## PrimeNG Table Global Filtering (RECOMMENDED)

**Use PrimeNG's native filtering instead of custom computed filters:**

### Component Implementation

```typescript
import { viewChild } from "@angular/core";
import { Table, TableModule } from "primeng/table";
import { IconField } from "primeng/iconfield";
import { InputIcon } from "primeng/inputicon";
import { InputText } from "primeng/inputtext";

@Component({
  selector: "app-my-list",
  imports: [
    TableModule,
    IconField,
    InputIcon,
    InputText,
    // ... other imports
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyListComponent {
  // ✅ GOOD: Use viewChild to access table reference
  myTable = viewChild<Table>("myTable");

  items = signal<Item[]>([]);
  searchText: string = "";

  // ✅ GOOD: Use PrimeNG's native filterGlobal method
  applyFilterGlobal($event: any) {
    this.myTable()?.filterGlobal(
      ($event.target as HTMLInputElement).value,
      "contains",
    );
  }
}
```

### Template Implementation

```html
<p-table
  #myTable
  [globalFilterFields]="['name', 'description', 'code']"
  [value]="items()"
  class="app-table"
  dataKey="uid"
>
  <ng-template pTemplate="caption">
    <div class="table-caption">
      <p-iconfield class="ml-auto" iconPosition="left">
        <p-inputicon>
          <i [class]="Icons.SEARCH"></i>
        </p-inputicon>
        <input
          (input)="applyFilterGlobal($event)"
          [(ngModel)]="searchText"
          class="search-input"
          pInputText
          placeholder="Search text"
          type="text"
        />
      </p-iconfield>
      <div class="caption-action-button">
        <!-- Action buttons -->
      </div>
    </div>
  </ng-template>
  <!-- ... rest of table template -->
</p-table>
```

### ❌ AVOID: Custom Computed Filters

```typescript
// ❌ NOT RECOMMENDED: Custom filter logic
searchTerm = model<string>("");

filteredItems = computed(() => {
  const search = this.searchTerm().toLowerCase().trim();
  if (!search) {
    return this.items();
  }
  return this.items().filter((item) =>
    item.name?.toLowerCase().includes(search),
  );
});
```

### Benefits of Native Filtering

1. **Performance**: PrimeNG's filtering is optimized for large datasets
2. **Less Code**: No need for custom computed signals or model bindings
3. **Consistency**: Uses PrimeNG's built-in filtering logic
4. **Multiple Fields**: Easy to search across multiple fields with `globalFilterFields`
5. **Future-Proof**: Leverages PrimeNG's maintained filtering features

## Enum Pattern (REQUIRED)

**MANDATORY: For every enum used in the application, you MUST create a corresponding pipe and use EnumTransformerService
for selects.**

### Step 1: Create a Pipe for Each Enum

**Example: For `MarkupApprovalStrategy` enum:**

```typescript
import { Pipe, PipeTransform } from "@angular/core";
import { MarkupApprovalStrategy } from "../../client/npiSeiko";

@Pipe({
  name: "markupApprovalStrategy",
  standalone: true,
})
export class MarkupApprovalStrategyPipe implements PipeTransform {
  transform(value: MarkupApprovalStrategy): string {
    switch (value) {
      case MarkupApprovalStrategy.FOR_ALL_QUOTATIONS:
        return "FOR ALL QUOTATIONS";
      case MarkupApprovalStrategy.BASED_ON_CUSTOM_RULES:
        return "BASED ON CUSTOM RULES";
      default:
        return "";
    }
  }
}
```

### Step 2: Use EnumTransformerService in Components

**NEVER hardcode enum options in components. ALWAYS use `EnumTransformerService`:**

```typescript
@Component({
  selector: "app-my-component",
  imports: [Select, FormsModule],
  providers: [
    // ✅ CRITICAL: Add pipes to providers when using inject()
    MarkupApprovalStrategyPipe,
    CurrencyExchangeRateStrategyPipe,
  ],
  templateUrl: "./my-component.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent implements OnInit {
  // ✅ GOOD: Store enum options in signals
  markupApprovalStrategyOptions = signal<
    { label: string; value: MarkupApprovalStrategy }[]
  >([]);

  // ✅ GOOD: Inject EnumTransformerService and the pipes
  private enumTransformer = inject(EnumTransformerService);
  private markupApprovalStrategyPipe = inject(MarkupApprovalStrategyPipe);

  ngOnInit() {
    this.initializeEnumOptions();
  }

  private initializeEnumOptions() {
    // ✅ GOOD: Use EnumTransformerService with the pipe
    this.markupApprovalStrategyOptions.set(
      this.enumTransformer.enumToLabelValue(
        MarkupApprovalStrategy,
        (value: MarkupApprovalStrategy) =>
          this.markupApprovalStrategyPipe.transform(value),
      ),
    );
  }
}
```

**Template usage:**

```html
<p-select
  [options]="markupApprovalStrategyOptions()"
  [ngModel]="selectedStrategy"
  (ngModelChange)="onStrategyChange($event)"
  placeholder="Select a strategy"
  appendTo="body"
/>
```

### ❌ FORBIDDEN: Hardcoded Enum Options

```typescript
// ❌ BAD: Hardcoded options
fieldConfigs = [
  {
    key: "markupApprovalStrategy",
    options: [
      { label: "For All Quotations", value: "FOR_ALL_QUOTATIONS" },
      { label: "Based on Custom Rules", value: "BASED_ON_CUSTOM_RULES" },
    ],
  },
];
```

## Enum References in Templates (CRITICAL)

**ALWAYS use enum references in templates, NEVER hard-coded string values:**

```typescript
// Component
export class MyComponent {
  protected readonly CostRequestStatus = CostRequestStatus; // Expose enum to template

  costRequest = signal<CostRequest>({ ... });
}
```

```html
<!-- ✅ GOOD: Use enum reference -->
@if (costRequest().status === CostRequestStatus.ESTIMATED) {
<p-button label="New Revision" />
} @if (costRequest().status !== CostRequestStatus.ABORTED) {
<p-button label="Abort" />
} @switch (costRequest().status) { @case (CostRequestStatus.PENDING_INFORMATION)
{
<p-tag value="Pending" severity="warn" />
} @case (CostRequestStatus.ESTIMATED) {
<p-tag value="Estimated" severity="success" />
} }

<!-- ❌ DANGEROUS: Hard-coded string values -->
@if (costRequest().status === "ESTIMATED") {
<!-- ⚠️ Breaks if enum value changes! -->
<p-button label="New Revision" />
} @if (costRequest().status !== "ABORTED") {
<!-- ⚠️ Breaks if enum value changes! -->
<p-button label="Abort" />
}
```

**Component setup:**

```typescript
export class MyComponent {
  // ✅ GOOD: Expose enums as protected readonly properties
  protected readonly CostRequestStatus = CostRequestStatus;
  protected readonly UserRole = UserRole;
  protected readonly Icons = Icons;
  protected readonly TableColsTitle = TableColsTitle;

  // Now available in template as CostRequestStatus.ESTIMATED, etc.
}
```

**Why this matters:**

- Hard-coded strings break silently if enum values change
- Enum references provide compile-time type safety
- Refactoring tools can track enum usage across templates
- TypeScript compiler catches errors during build

## Icons (REQUIRED)

**ALL icon references MUST use the `Icons` enum from `src/app/models/enums/icons.ts`. Never use inline `pi pi-*`
strings.**

```html
<!-- ✅ GOOD: Always use Icons enum -->
<i [class]="Icons.CALENDAR"></i>
<p-button [icon]="Icons.PLUS" />

<!-- ❌ BAD: Never inline icon class strings -->
<i class="pi pi-calendar"></i>
<p-button icon="pi pi-plus" />
```

```typescript
// ✅ GOOD: Expose Icons in component
export class MyComponent {
  protected readonly Icons = Icons;
}
```

If an icon is missing from the enum, **add it to `src/app/models/enums/icons.ts`** — never use the raw string in
templates.

## PrimeNG `class` vs `styleClass` (REQUIRED)

**`styleClass` is deprecated since PrimeNG v20. ALWAYS use `class` instead.**

```html
<!-- ✅ GOOD -->
<p-tag class="my-tag" />
<p-skeleton class="mb-3" />

<!-- ❌ BAD: deprecated -->
<p-tag styleClass="my-tag" />
<p-skeleton styleClass="mb-3" />
```

## Key Rules

1. ✅ **ALWAYS** use `ChangeDetectionStrategy.OnPush` for all components
2. ✅ **ALWAYS** use `inject()` function instead of constructor injection
3. ✅ **ALWAYS** use `input()` and `output()` instead of `@Input/@Output`
4. ✅ **ALWAYS** use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
5. ✅ **ALWAYS** use `[class]` and `[style]` bindings instead of `ngClass`/`ngStyle`
6. ✅ **ALWAYS** use `class="app-table"` for all PrimeNG tables
7. ✅ **ALWAYS** create a pipe for each enum and use `EnumTransformerService` for selects
8. ✅ **ALWAYS** expose enums as `protected readonly` properties in components for template use
9. ✅ **ALWAYS** use enum references in templates (e.g., `CostRequestStatus.ESTIMATED`) instead of hard-coded strings (
   e.g., `"ESTIMATED"`)
10. ✅ **ALWAYS** use `Icons` enum for all icons — `[class]="Icons.XXX"` or `[icon]="Icons.XXX"`
11. ✅ **ALWAYS** use `class` instead of the deprecated `styleClass` on PrimeNG components
12. ❌ **NEVER** set `standalone: true` (it's the default in Angular 20+)
13. ❌ **NEVER** hardcode enum options in components
14. ❌ **NEVER** use hard-coded enum string values in template comparisons or conditions
15. ❌ **NEVER** use inline `pi pi-*` strings in templates — always reference `Icons` enum
16. ❌ **NEVER** display a `uid` (UUID) as user-facing text — UIDs are technical identifiers, not labels. If a human-readable value is absent, show `null` or omit entirely

```typescript
// ❌ BAD: uid as fallback text
header: `Edit — ${item.name ?? item.uid}`

// ✅ GOOD: show the meaningful value or nothing
header: `Edit${item.name ? ` — ${item.name}` : ""}`
```
