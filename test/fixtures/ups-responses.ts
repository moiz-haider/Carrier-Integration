export const upsOAuthSuccess = {
  access_token: 'test_token_abc123',
  token_type: 'Bearer',
  expires_in: 3600,
};

export const upsRateSuccess = {
  RateResponse: {
    Response: {
      ResponseStatus: { Code: '1', Description: 'Success' },
    },
    RatedShipment: [
      {
        Service: { Code: '03', Name: 'Ground' },
        TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '24.50' },
        TimeInTransit: {
          ServiceSummary: {
            EstimatedArrival: { TotalTransitDays: '5' },
          },
        },
      },
      {
        Service: { Code: '02', Name: '2nd Day Air' },
        TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '42.00' },
        TimeInTransit: {
          ServiceSummary: {
            EstimatedArrival: { TotalTransitDays: '2' },
          },
        },
      },
    ],
  },
};

export const upsRateSingle = {
  RateResponse: {
    Response: { ResponseStatus: { Code: '1', Description: 'Success' } },
    RatedShipment: {
      Service: { Code: '01', Name: 'Next Day Air' },
      TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '89.99' },
      TimeInTransit: {
        ServiceSummary: { EstimatedArrival: { TotalTransitDays: '1' } },
      },
    },
  },
};

export const upsRateEmptyRatedShipment = {
  RateResponse: {
    Response: { ResponseStatus: { Code: '1' } },
    RatedShipment: [],
  },
};

export const upsRateMalformed = {
  RateResponse: {},
};

export const upsErrorFault = {
  response: {
    errors: [{ code: '123', message: 'Invalid postal code' }],
  },
};
