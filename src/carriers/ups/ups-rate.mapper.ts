import type { Address, Package, RateRequest, RateQuote } from '../../types';
import { CarrierIntegrationError } from '../../common/errors';
import type {
  UpsRateRequest,
  UpsRateResponse,
  UpsAddress,
  UpsPackage,
  UpsRatedShipment,
} from './ups-api.types';

export function buildUpsRateRequest(req: RateRequest): UpsRateRequest {
  const shipFrom = toUpsAddress(req.origin);
  const shipTo = toUpsAddress(req.destination);
  const pkg = toUpsPackage(req.package);

  const shipment: UpsRateRequest['RateRequest']['Shipment'] = {
    Shipper: { Address: shipFrom },
    ShipTo: { Address: shipTo },
    ShipFrom: { Address: shipFrom },
    Package: [pkg],
  };
  if (req.serviceLevel) {
    shipment.Service = { Code: mapServiceLevelToUpsCode(req.serviceLevel) };
  }

  return {
    RateRequest: {
      Request: { RequestOption: ['Shop'] },
      Shipment: shipment,
    },
  };
}

function toUpsAddress(a: Address): UpsAddress {
  return {
    AddressLine: a.lines,
    City: a.city,
    StateProvinceCode: a.stateOrProvinceCode,
    PostalCode: a.postalCode,
    CountryCode: a.countryCode,
  };
}

function toUpsPackage(p: Package): UpsPackage {
  const ups: UpsPackage = {
    SimpleWeight: { Weight: String(p.weightKg) },
  };
  if (p.dimensions) {
    ups.Dimensions = {
      Length: String(p.dimensions.lengthCm),
      Width: String(p.dimensions.widthCm),
      Height: String(p.dimensions.heightCm),
      Unit: { Code: 'CM' },
    };
  }
  return ups;
}

function mapServiceLevelToUpsCode(level: string): string {
  const normalized = level.toLowerCase();
  const map: Record<string, string> = {
    ground: '03',
    '3day': '12',
    '2nd day': '02',
    '2nd day air': '02',
    express: '01',
    'next day air': '01',
  };
  return map[normalized] ?? level;
}

export function parseUpsRateResponse(raw: UpsRateResponse): RateQuote[] {
  const rated = raw.RateResponse?.RatedShipment;
  if (!rated) {
    const errors = (raw as { response?: { errors?: Array<{ message: string }> } }).response?.errors;
    const msg = errors?.map((e) => e.message).join('; ') ?? 'Missing RatedShipment in UPS response';
    throw new CarrierIntegrationError(
      { code: 'BAD_RESPONSE', message: msg, carrierContext: JSON.stringify(raw).slice(0, 500) },
    );
  }

  const list = Array.isArray(rated) ? rated : [rated];
  const quotes: RateQuote[] = [];

  for (const s of list) {
    const q = parseRatedShipment(s);
    if (q) quotes.push(q);
  }

  return quotes;
}

function parseRatedShipment(s: UpsRatedShipment): RateQuote | null {
  const code = s.Service?.Code ?? 'UNKNOWN';
  const name = s.Service?.Name ?? code;
  const monetary = s.TotalCharges?.MonetaryValue;
  const currency = s.TotalCharges?.CurrencyCode ?? 'USD';
  if (monetary === undefined || monetary === null) return null;

  const totalCharge = parseFloat(monetary);
  if (Number.isNaN(totalCharge)) return null;

  const transitDays = s.TimeInTransit?.ServiceSummary?.EstimatedArrival?.TotalTransitDays;
  const estimatedTransitDays = transitDays != null ? parseInt(String(transitDays), 10) : undefined;

  return {
    serviceCode: code,
    serviceName: name,
    totalCharge,
    currency,
    estimatedTransitDays: Number.isNaN(estimatedTransitDays as number) ? undefined : estimatedTransitDays,
  };
}
