export interface PricingEntry {
  id: string;
  url: string;
}

export interface TestService {
  name: string;
  organizationId: string;
  activePricings: Record<string, PricingEntry>;
  archivedPricings: Record<string, PricingEntry>;
}