export type CarrierErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'RATE_LIMITED'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'BAD_RESPONSE'
  | 'VALIDATION_ERROR'
  | 'CARRIER_SERVER_ERROR'
  | 'CARRIER_CLIENT_ERROR'
  | 'UNKNOWN';

export interface CarrierErrorDetails {
  code: CarrierErrorCode;
  message: string;
  httpStatus?: number;
  carrierContext?: string;
}

export class CarrierIntegrationError extends Error {
  constructor(
    public readonly details: CarrierErrorDetails,
    public readonly cause?: unknown,
  ) {
    super(details.message);
    this.name = 'CarrierIntegrationError';
    Object.setPrototypeOf(this, CarrierIntegrationError.prototype);
  }
}

export function isCarrierIntegrationError(
  err: unknown,
): err is CarrierIntegrationError {
  return err instanceof CarrierIntegrationError;
}
