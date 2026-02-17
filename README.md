# Carrier Integration Service

A NestJS-based shipping carrier integration service that wraps the UPS Rating API for rate shopping. Built for Cybership's take-home assessment with extensibility for additional carriers (FedEx, USPS, DHL) and operations (labels, tracking, address validation).

## Design Decisions

### Architecture & Extensibility

- **Carrier abstraction**: The `CarrierRateProvider` interface (`src/carriers/carrier.interface.ts`) defines a single method `getRates(request)`. UPS implements this in `UpsRateService`. Adding FedEx means implementing another class that implements `CarrierRateProvider` and registering it in the app; no changes to existing UPS code.
- **Operation abstraction**: Auth and HTTP are separated: `IUpsHttpClient` is injectable so the same HTTP layer can be reused for future operations (e.g. purchase label, tracking). New operations would add methods to the client interface and corresponding service methods.
- **Module boundaries**: Each carrier lives in its own folder under `src/carriers/<carrier>/`. Domain types (`Address`, `Package`, `RateRequest`, `RateQuote`) live in `src/types/` and are carrier-agnostic. **Orchestration**: `RatesService` injects `CarrierRateProvider[]` (registered in `RatesModule`). Adding a new carrier = add a provider to the array; no changes to `RatesService` or existing carrier code. Optional `request.carrierId` selects a carrier; when omitted, the first registered provider is used.

### Types & Domain Modeling

- **Domain types** in `src/types/` (`Address`, `Package`, `RateRequest`, `RateQuote`, `RateResponse`) are the single source of truth for the public API. Request and response use these types only.
- **Carrier-specific shapes** (e.g. `UpsRateRequest`, `UpsRateResponse`) live inside `src/carriers/ups/` and are used only by the UPS adapter. Mappers (`ups-rate.mapper.ts`) convert domain ↔ UPS API shapes so callers never see UPS formats.

### Authentication

- **UPS OAuth 2.0 client credentials**: Implemented in `UpsAuthService`. Token is fetched via `IUpsHttpClient.getToken()`, cached in memory, and reused until close to expiry (1-minute buffer). `getValidToken()` is used by the rate service so callers never handle tokens.
- **Transparent refresh**: If a rate request returns 401, `UpsRateService` invalidates the cache, fetches a new token, and retries once.

### Configuration

- All secrets and environment-specific values come from **environment variables**. `src/config/configuration.ts` reads them via `loadConfig()`; no hardcoded credentials. `.env.example` lists required variables.

### Error Handling

- **Structured errors**: `CarrierIntegrationError` with `details: { code, message, httpStatus?, carrierContext? }`. Codes include `AUTH_FAILED`, `RATE_LIMITED`, `NETWORK_TIMEOUT`, `BAD_RESPONSE`, `VALIDATION_ERROR`, `CARRIER_SERVER_ERROR`, `CARRIER_CLIENT_ERROR`.
- **Global filter**: `CarrierErrorFilter` maps `CarrierIntegrationError` to HTTP status and JSON body so the API returns consistent error payloads. Only `code` and `message` are returned to the client; `carrierContext` is not exposed in API responses (kept for server-side logging/debugging). No swallowed exceptions.

### Validation

- **Zod** schemas in `src/domain/validation/` validate all inputs before any external call. `UpsRateService.getRates()` validates the request and throws `VALIDATION_ERROR` with field-level messages on failure.

## How to Run

### Prerequisites

- Node.js 18+
- npm or yarn

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and set values. For local development without real UPS credentials, you can set dummy values; the app will start but rate calls will fail until you stub the client or use real credentials.

```bash
# Linux/macOS:
cp .env.example .env
# Windows (PowerShell):
# Copy-Item .env.example .env
# Edit .env: UPS_CLIENT_ID, UPS_CLIENT_SECRET (or use placeholders for stub-only runs)
```

### Build

```bash
npm run build
```

### Run the API

```bash
npm run start
# or
npm run start:dev
```

Server listens on `http://localhost:3000`. Example rate request:

```bash
curl -X POST http://localhost:3000/rates/shop \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lines": ["123 Main St"], "city": "San Francisco", "stateOrProvinceCode": "CA", "postalCode": "94102", "countryCode": "US"},
    "destination": {"lines": ["456 Oak Ave"], "city": "Los Angeles", "stateOrProvinceCode": "CA", "postalCode": "90001", "countryCode": "US"},
    "package": {"weightKg": 5.5, "dimensions": {"lengthCm": 30, "widthCm": 20, "heightCm": 15}}
  }'
```

### Tests

- **All tests** (unit + integration):  
  `npm test`

- **Integration only** (stubbed HTTP, no live API):  
  `npm run test:integration`

Integration tests verify:

- Request payloads are correctly built from domain models and sent to the stubbed client.
- Successful UPS-style responses are parsed and normalized into `RateQuote[]`.
- Auth token lifecycle: first call acquires token, second reuses; 401 triggers cache invalidation and one retry with a new token.
- Error paths: 4xx/5xx, malformed response, validation failure, and **timeout** produce the expected `CarrierIntegrationError` codes (timeout does not trigger token refresh).
- **Orchestration**: `RatesService` uses default carrier when `carrierId` is omitted; respects `carrierId` when provided; returns `VALIDATION_ERROR` for unknown carrier.

## What I Would Improve Given More Time

- **FedEx skeleton**: Add a `fedex` folder with `CarrierRateProvider` and a stub implementation to demonstrate the pattern without full FedEx API details.
- **Request ID / correlation**: Add a request-scoped ID and include it in error responses and logs for tracing.
- **Structured logging**: Replace ad-hoc logging with a logger (e.g. Pino) and log request/response summaries (sanitized) and errors.
- **Health check**: Endpoint that checks config presence and optionally carrier connectivity (with short timeout) for load balancers.
- **OpenAPI**: Swagger/OpenAPI for the rate request and response so frontends and partners have a clear contract.

## Project Structure

```
src/
  common/           # Errors, filters
  config/           # Env-based configuration
  types/            # Domain types: Address, Package, RateRequest, RateQuote, RateResponse
  domain/           # Validation schemas (Zod) for domain types
  carriers/
    carrier.interface.ts
    ups/             # UPS auth, HTTP client, rate mapper, rate service
  rates/             # RatesController, RatesService (orchestration)
  app.module.ts
  main.ts
test/
  fixtures/          # Rate request and UPS response payloads
  integration/       # End-to-end tests with stubbed HTTP
```

## License

Private – Cybership take-home assessment.
