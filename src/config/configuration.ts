export interface AppConfig {
  http: {
    timeoutMs: number;
    rateRequestTimeoutMs: number;
  };
  ups: {
    baseUrl: string;
    oauthTokenPath: string;
    clientId: string;
    clientSecret: string;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const v = process.env[key];
  if (v !== undefined && v !== '') return v;
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing required environment variable: ${key}`);
}

function getEnvOptional(key: string, defaultValue = ''): string {
  const v = process.env[key];
  return v !== undefined && v !== '' ? v : defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultValue;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return defaultValue;
  return n;
}

export function loadConfig(): AppConfig {
  const baseUrl = process.env.UPS_BASE_URL ?? 'https://onlinetools.ups.com';
  return {
    http: {
      timeoutMs: getEnvNumber('HTTP_TIMEOUT_MS', 15000),
      rateRequestTimeoutMs: getEnvNumber('HTTP_RATE_REQUEST_TIMEOUT_MS', 20000),
    },
    ups: {
      baseUrl: baseUrl.replace(/\/$/, ''),
      oauthTokenPath:
        process.env.UPS_OAUTH_TOKEN_PATH ?? '/security/v1/oauth/token',
      clientId: getEnvOptional('UPS_CLIENT_ID'),
      clientSecret: getEnvOptional('UPS_CLIENT_SECRET'),
    },
  };
}
