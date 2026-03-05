import { addDays } from "date-fns";
import { LeanContract } from "../../types/models/Contract";
import { escapeContractedServiceVersions } from "./helpers";
import { convertKeysToLowercase } from "../helpers";

export function performNovation(contract: LeanContract, newSubscription: any): LeanContract {
  const newContract: LeanContract = {
    ...contract,
    contractedServices: convertKeysToLowercase(escapeContractedServiceVersions(newSubscription.contractedServices)),
    subscriptionPlans: convertKeysToLowercase(newSubscription.subscriptionPlans),
    subscriptionAddOns: convertKeysToLowercase(newSubscription.subscriptionAddOns),
  };

  newContract.history.push({
    startDate: contract.billingPeriod.startDate,
    endDate: new Date(),
    contractedServices: contract.contractedServices,
    subscriptionPlans: contract.subscriptionPlans,
    subscriptionAddOns: contract.subscriptionAddOns,
  });

  const startDate = new Date();
  const renewalDays = newContract.billingPeriod?.renewalDays ?? 30; // Default to 30 days if not provided
  const endDate = addDays(new Date(startDate), renewalDays);

  newContract.billingPeriod = {
    startDate: startDate,
    endDate: endDate,
    autoRenew: newSubscription.billingPeriod?.autoRenew ?? contract.billingPeriod.autoRenew,
    renewalDays: renewalDays,
  };

  return newContract;
}