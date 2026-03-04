export interface UserContact {
  userId?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface BillingPeriod {
  autoRenewal: boolean;
  autoRenew?: boolean;
  startDate?: string; // ISO
  endDate?: string; // ISO
  period?: string;
  renewalDays?: number;
}

export interface HistoryEntry {
  startDate?: string;
  endDate?: string;
  contractedServices?: Record<string, string>;
  subscriptionPlans?: Record<string, string>;
  subscriptionAddOns?: Record<string, Record<string, number>>;
}

export interface ServiceSubscription {
  serviceName: string;
  pricingVersion: string;
  subscriptionPlan?: string;
  subscriptionAddOns?: Record<string, number>;
}

export interface UsageLevel {
  resetTimeStamp?: string;
  consumed?: number;
  limit?: number;
}

export interface Subscription {
  userId: string;
  userContact: UserContact;
  active: boolean;
  services: ServiceSubscription[];
  subscriptionPlans?: Record<string, string>;
  subscriptionAddOns?: Record<string, Record<string, number>>;
  usageLevels?: Record<string, Record<string, UsageLevel>>;
  billingPeriod?: BillingPeriod;
  history?: HistoryEntry[];
  createdAt?: string;
}

export type ContractsQueryBody = {
  services?: string[] | Record<string, string[]>;
  subscriptionPlans?: Record<string, string[]>;
  subscriptionAddOns?: Record<string, string[]>;
};
