export interface UpsOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UpsAddress {
  AddressLine: string[];
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
}

export interface UpsPackage {
  SimpleWeight?: { Weight: string };
  Dimensions?: {
    Length: string;
    Width: string;
    Height: string;
    Unit?: { Code: string };
  };
  Packaging?: { Code: string };
}

export interface UpsRateRequest {
  RateRequest: {
    Request: { RequestOption?: string[] };
    Shipment: {
      Shipper: { Address: UpsAddress };
      ShipTo: { Address: UpsAddress };
      ShipFrom: { Address: UpsAddress };
      Package: UpsPackage[];
      Service?: { Code: string };
    };
  };
}

export interface UpsRatedShipment {
  Service?: { Code: string; Name?: string };
  RatedShipmentAlert?: Array<{ Code?: string; Description?: string }>;
  TotalCharges?: { CurrencyCode: string; MonetaryValue: string };
  ServiceOptionsCharges?: { CurrencyCode: string; MonetaryValue: string };
  TimeInTransit?: { ServiceSummary?: { EstimatedArrival?: { TotalTransitDays?: string } } };
}

export interface UpsRateResponse {
  RateResponse?: {
    Response?: { ResponseStatus?: { Code: string; Description?: string } };
    RatedShipment?: UpsRatedShipment | UpsRatedShipment[];
  };
  response?: {
    errors?: Array<{ code: string; message: string }>;
  };
}
