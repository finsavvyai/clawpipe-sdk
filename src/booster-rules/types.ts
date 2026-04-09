/** Shared interface for all booster rules. */
export interface BoosterRule {
  name: string;
  test: (input: string) => boolean;
  resolve: (input: string) => string;
}
