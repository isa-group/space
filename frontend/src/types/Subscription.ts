export interface UserContact {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface BillingPeriod {
  autoRenewal: boolean;
  startDate?: string; // ISO
  endDate?: string; // ISO
  period?: string;
}

export interface ServiceSubscription {
  serviceName: string;
  pricingVersion: string;
  subscriptionPlan?: string;
  subscriptionAddOns?: Record<string, number>;
}

export interface Subscription {
  userId: string;
  userContact: UserContact;
  active: boolean;
  services: ServiceSubscription[];
  subscriptionPlans?: Record<string, string>;
  subscriptionAddOns?: Record<string, Record<string, number>>;
  billingPeriod?: BillingPeriod;
  createdAt?: string;
}

export type ContractsQueryBody = {
  services?: string[] | Record<string, string[]>;
  subscriptionPlans?: Record<string, string[]>;
  subscriptionAddOns?: Record<string, string[]>;
};
