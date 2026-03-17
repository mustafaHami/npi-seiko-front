# Development Commands

## Initial Setup

```bash
npm install
npm run openapi-ts  # Generate API client from swagger-npi-seiko.yaml
```

## Development

```bash
npm run debug        # Dev server on port 4205 (development config)
npm start            # Dev server on default port (production config)
npm run build        # Production build
npm test             # Run Karma tests
```

## API Client Generation

```bash
npm run openapi-ts   # Regenerate API client from swagger-npi-seiko.yaml
```

## Build Configurations

- `development` - Dev environment with source maps (port 4205)
- `production` - Production build (default)
- `demo` - Demo environment
- `sandbox` - Sandbox environment

## Docker Deployment

### Building Image

```bash
docker build -t npi-seiko-front-image:1.0.0 -f ./Dockerfile .
```

**Note:** Dockerfile includes `npm run openapi-ts` step, so API client is generated automatically during build.

### Deployment Process

1. Build Docker image locally
2. Export: `docker save -o npi-seiko-front-image.tar npi-seiko-front-image:1.0.0`
3. Transfer to server: `scp npi-seiko-front-image.tar USERNAME@IPADDRESS:/tmp`
4. Load on server: `docker load -i /tmp/npi-seiko-front-image.tar`
5. Restart containers: `docker compose -f /opt/work/docker-compose.yaml restart web`

## Application Initialization Flow

1. `main.ts` bootstraps `AppComponent` with `appConfig`
2. `APP_INITIALIZER` runs `ConfigService.loadConfig()`
3. Loads `/assets/config.json` and sets `environment.backendUrl`
4. Configures OpenAPI client with base URL
5. Starts version polling (every 60 seconds)
6. App ready for user interaction

## Environment Files

Files in `src/environments/`:

- `environment.ts` - Production (default)
- `environment.development.ts` - Development
- `environment.demo.ts` - Demo
- `environment.sandbox.ts` - Sandbox
- `routes.environment.ts` - Route definitions (shared across all environments)
