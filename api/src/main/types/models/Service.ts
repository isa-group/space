export interface PricingEntry {
  id: string;
  url: string;
}

export interface LeanService {
  id?: string;
  name: string;
  disabled: boolean;
  organizationId: string;
  activePricings: Record<string, PricingEntry>;
  archivedPricings?: Record<string, PricingEntry>;
}

export type ServiceQueryFilters = {
  name?: string;
  page?: number;
  offset?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}