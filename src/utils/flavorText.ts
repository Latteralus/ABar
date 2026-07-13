/** Fills `{token}` placeholders in a flavor-text template, e.g. fillTemplate("{customer} waved", { customer: "Sam" }). */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}
