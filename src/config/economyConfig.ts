export const ECONOMY_CONFIG = {
  salesTaxRate: 0.0825,
  cardProcessing: {
    percentFee: 0.029,
    fixedFeeCents: 30,
  },
  tips: {
    barSharePercent: 0.25,
    employeeSharePercent: 0.75,
  },
  /** Share of card-paying customers vs cash, used when a customer decides how to pay. */
  cardPaymentProbability: 0.6,
};
