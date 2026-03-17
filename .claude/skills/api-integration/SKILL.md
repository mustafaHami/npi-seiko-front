# API Integration

## OpenAPI Configuration

- Config: `openapi-config/openapi-ts.npi-seiko.config.ts`
- Swagger spec: `swagger-npi-seiko.yaml`
- Generated client: `src/client/costSeiko/`
    - `sdk.gen.ts` - Service classes
    - `types.gen.ts` - TypeScript interfaces and enums
    - `client.gen.ts` - Client provider

## Client Setup

- Provided via `provideHeyApiClient()` in `app.config.ts`
- Base URL set dynamically from `environment.backendUrl` (loaded from `/assets/config.json`)

## Regenerating API Client

When backend API changes:

1. Update `swagger-npi-seiko.yaml` with new OpenAPI spec
2. Run `npm run openapi-ts`
3. Generated client appears in `src/client/costSeiko/`
4. Update repositories in `src/app/repositories/` as needed

```bash
npm run openapi-ts
```

## Usage in Repositories

```typescript
import { fromRequest } from 'src/app/utils/from-request';

@Injectable({ providedIn: "root" })
export class UserRepo {
  private userService = inject(User2); // Generated client

  searchUsers(offset: number, limit: number): Observable<UsersPaginated> {
    return fromRequest(
      this.userService.searchUsers({
        query: { offset, limit },
      })
    );
  }
}
```

## fromRequest Utility

Converts HeyAPI client promises to Observables:

```typescript
// src/app/utils/from-request.ts
export function fromRequest<T>(promise: Promise<T>): Observable<T> {
  return from(promise);
}
```

## Error Handling

Global error interceptor handles all HTTP errors automatically:

```typescript
// Custom error handling when needed
this.userRepo
  .deleteUser(userId)
  .pipe(take(1))
  .subscribe({
    next: () => {
      this.handleToastMessage.successMessage("User deleted");
    },
  });
```

## Skip Error Toast

For specific requests where you want to handle errors manually:

```typescript
import { SKIP_ERROR_TOAST } from "src/app/configs/interceptors/http-context-tokens";

this.http.get(url, {
  context: new HttpContext().set(SKIP_ERROR_TOAST, true)
});
```

## Environment Configuration

Dynamic configuration from `/assets/config.json`:

```json
{
  "apiUrl": "https://api.example.com",
  "version": "1.2.3",
  "buildTimestamp": "2024-01-01T00:00:00Z"
}
```

Loaded on application initialization and available through `environment.backendUrl`.
