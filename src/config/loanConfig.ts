export const LOAN_CONFIG = {
  principalCents: 1000000, // $10,000.00
  annualInterestRatePercent: 12,
  paymentFrequencyDays: 7,
  /** Minimum payment as a percent of remaining balance, floored by minimumPaymentFloorCents. */
  minimumPaymentPercentOfBalance: 0.05,
  minimumPaymentFloorCents: 10000, // $100.00
};
