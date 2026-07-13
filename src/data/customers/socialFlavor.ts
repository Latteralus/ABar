/** Cosmetic activity-log lines for customers socializing between rounds. `{customer}` and `{employee}` are filled in by whoever picks a template. */
export const SOCIAL_FLAVOR_GENERIC: readonly string[] = [
  "{customer} chatted with another patron.",
  "{customer} people-watched from their seat.",
  "{customer} struck up a conversation with the group nearby.",
  "{customer} relaxed and took in the atmosphere.",
  "{customer} laughed at something someone said nearby.",
  "{customer} scrolled through their phone between sips.",
];

export const SOCIAL_FLAVOR_WITH_STAFF: readonly string[] = [
  "{customer} chatted with {employee}.",
  "{customer} traded stories with {employee} between rounds.",
  "{customer} asked {employee} for a recommendation.",
];
