## API-first workflow (MANDATORY)

When implementing a new view/feature that requires backend data:

1. **Check the OpenAPI spec first** (`swagger-npi-seiko.yaml`) to confirm the endpoint already exists.

2. If the endpoint **does not exist**, you MUST design and add it to `swagger-npi-seiko.yaml`, reusing existing project
   patterns (see the User APIs as the reference).

### Search endpoints (MANDATORY pattern)

For any `search` endpoint:

- Use `offset` and `limit` as **query parameters** (pagination).
- In the **summary**, explicitly list what fields/criteria can be searched/filtered (e.g., “Search by name, email,
  role…”).
- The **200 response** MUST return a paginated body:
  - Use a response schema that follows the existing convention:
    - includes `PaginationInfos`
    - and returns `results: <Entity>[]` (the corresponding objects list)

## Retrieve / Update endpoints (UID-based CRUD grouping — REQUIRED)

### Critical rule

**Do NOT create separate YAML path entries for GET and PUT.**  
GET and PUT for the same resource MUST be defined under the **same path key**:

- `/<resources>/{uid}` must contain BOTH:
  - `get:` for retrieve
  - `put:` (or `patch:` if used in the project) for update
- `uid` is the canonical identifier for retrieving/updating a single object.

### Path-level parameters

- Define the UID parameter at the **path level** under `/<resources>/{uid}:`
  - `parameters: - $ref: '#/components/parameters/uidParam'`

This avoids duplication and guarantees a consistent signature across methods.

### Minimal success responses only

- Use only `200` for retrieve/update success (no extra error blocks by default).

### Example (reference format)

```yaml
/<resources>/{uid}:
  parameters:
    - $ref: "#/components/parameters/uidParam"
  get:
    tags:
      - <resourceTag>
    summary: Retrieve a <resource>
    operationId: retrieve<Resource>
    responses:
      "200":
        description: <resource>
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/<Resource>"
  put:
    tags:
      - <resourceTag>
    summary: Update a <resource>
    operationId: update<Resource>
    requestBody:
      description: update <resource> object
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/<Resource>Update"
      required: true
    responses:
      "200":
        description: object updated
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/<Resource>"
  /<resources>:
  post:
    tags:
      - <resourceTag>
    summary: Create a new <resource>
    operationId: create<Resource>
    requestBody:
      description: New <resource>
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/<Resource>Create"
      required: true
    responses:
      "201":
        description: object created
```

### Response codes (simplified)

- Only declare the main success response codes:
  - `200` for successful reads/updates
  - `201` for successful creates
- Do **not** add multiple error response blocks unless there is a strong, explicit need (default to minimal responses).

3. Regenerate the OpenAPI TypeScript client:

- `npm run openapi-ts`

4. Implement or update the corresponding repository method in `src/app/repositories/`:

- Repositories are the ONLY allowed access point to API calls from the frontend.
- Use `fromRequest<T>(promise)` to convert generated-client Promises to Observables.

5. Use repository methods from components/services (never call generated client services directly).

If unsure, inspect how Customer endpoints (especially search + pagination + uid paths) are modeled in the current spec
and
replicate the same approach.

```

```
