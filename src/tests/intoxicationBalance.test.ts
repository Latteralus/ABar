import { describe, expect, it } from "vitest";
import { CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";

/**
 * Regression guard for a real balance bug found during Stage 2: with the original numbers
 * (12 intoxication/drink, cutoff at 70, removal at 85, 6-round cap), the service cutoff always
 * blocked a customer's next drink with room to spare below the removal threshold — so nobody
 * could ever actually reach "eligible for removal" and Section 11's removal flow was dead code
 * in practice. These invariants keep that from silently regressing if the numbers get retuned.
 */
describe("intoxication balance invariants", () => {
  it("lets a drink accepted just under the cutoff still cross the removal threshold once delivered", () => {
    const { intoxicationServiceCutoff, intoxicationPerAlcoholicDrink, intoxicationRemovalThreshold } = CUSTOMER_BEHAVIOR_CONFIG;
    expect(intoxicationServiceCutoff + intoxicationPerAlcoholicDrink).toBeGreaterThan(intoxicationRemovalThreshold);
  });

  it("lets the per-visit round cap actually accumulate enough intoxication to reach removal", () => {
    const { maxRoundsPerVisit, intoxicationPerAlcoholicDrink, intoxicationRemovalThreshold } = CUSTOMER_BEHAVIOR_CONFIG;
    expect(maxRoundsPerVisit * intoxicationPerAlcoholicDrink).toBeGreaterThanOrEqual(intoxicationRemovalThreshold);
  });

  it("keeps the cutoff strictly below the removal threshold (stop-serving is a lesser response than removal)", () => {
    expect(CUSTOMER_BEHAVIOR_CONFIG.intoxicationServiceCutoff).toBeLessThan(CUSTOMER_BEHAVIOR_CONFIG.intoxicationRemovalThreshold);
  });
});
