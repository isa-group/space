import { LeanContract, UsageLevel } from '../../types/models/Contract';
import { EvaluationContext, PricingContext, SubscriptionContext } from '../../types/models/FeatureEvaluation';
import { LeanAddOn, LeanPlan, LeanPricing } from '../../types/models/Pricing';

function flattenUsageLevelsIntoSubscriptionContext(
  subscriptionContextByServices: Record<string, Record<string, UsageLevel>>
): SubscriptionContext {
  const flattened: SubscriptionContext = {};

  for (const [serviceName, context] of Object.entries(subscriptionContextByServices)) {
    for (const [usageLimitName, usageLevelValue] of Object.entries(context)) {
      const flattenedKey = `${serviceName.toLowerCase()}-${usageLimitName}`;
      flattened[flattenedKey] = usageLevelValue.consumed;
    }
  }

  return flattened;
}

function flattenFeatureEvaluationsIntoEvaluationContext(
  evaluationContextByServices: Record<string, Record<string, string>>
): EvaluationContext {
  const flattened: EvaluationContext = {};

  for (const [serviceName, context] of Object.entries(evaluationContextByServices)) {
    for (const [featureName, expression] of Object.entries(context)) {
      const flattenedKey = `${serviceName.toLowerCase()}-${featureName}`;
      flattened[flattenedKey] = expression;
    }
  }

  return flattened;
}

function flattenConfigurationsIntoPricingContext(
  contextByServices: Record<string, PricingContext>
): PricingContext {
  const flattened: PricingContext = { features: {}, usageLimits: {} };

  for (const [serviceName, context] of Object.entries(contextByServices)) {
    for (const [category, categoryValue] of Object.entries(context)) {
      for (const [itemName, itemValue] of Object.entries(categoryValue)) {
        const flattenedKey = `${serviceName.toLowerCase()}-${itemName}`;
        flattened[category as 'features' | 'usageLimits'][flattenedKey] = itemValue;
      }
    }
  }

  return flattened;
}

function getUserSubscriptionsFromContract(
  contract: LeanContract
): Record<string, { plan?: string; addOns?: Record<string, number> }> {
  const contractedServices = Object.keys(contract.contractedServices);
  const plans: Record<string, string> = contract.subscriptionPlans;
  const addOns: Record<string, Record<string, number>> = contract.subscriptionAddOns;
  const subscriptionsByService: Record<string, { plan?: string; addOns?: Record<string, number> }> =
    {};

  for (const serviceName of contractedServices) {
    subscriptionsByService[serviceName] = {
      plan: plans[serviceName],
      addOns: addOns[serviceName],
    };
  }

  return subscriptionsByService;
}

function findPlanCaseInsensitive(
  planName: string,
  plans: Record<string, LeanPlan>
): LeanPlan | undefined {
  // First try exact match
  if (plans[planName]) {
    return plans[planName];
  }
  
  // Then try case-insensitive match
  const normalizedPlanName = planName.toLowerCase();
  for (const [key, plan] of Object.entries(plans)) {
    if (key.toLowerCase() === normalizedPlanName) {
      return plan;
    }
  }
  
  return undefined;
}

function mapSubscriptionsToConfigurationsByService(
  userSubscriptionsByService: Record<string, { plan?: string; addOns?: Record<string, number> }>,
  userPricings: Record<string, LeanPricing>
): Record<string, PricingContext> {
  const userConfigurationsByService: Record<string, PricingContext> = {};

  for (const [serviceName, subscription] of Object.entries(userSubscriptionsByService)) {
    const pricing: LeanPricing = userPricings[serviceName];

    if (!subscription.plan && pricing.plans && Object.keys(pricing.plans).length > 0) {
      throw new Error(
        `No plan found in user subscription for service ${serviceName}, whose pricing do have plans`
      );
    }

    const plan = findPlanCaseInsensitive(subscription.plan ?? '', pricing.plans ?? {});

    if (subscription.plan && pricing.plans && Object.keys(pricing.plans).length > 0 && !plan) {
      throw new Error(
        `Plan ${subscription.plan} not found in pricing for service ${serviceName}, whose pricing do have plans.`
      );
    }

    const addOns = pricing.addOns
      ? Object.fromEntries(
          Object.entries(pricing.addOns).filter(
            ([key]) => subscription.addOns && Object.keys(subscription.addOns).includes(key) && subscription.addOns![key] > 0
          )
        )
      : undefined;

    if (!pricing) {
      continue;
    }

    const pricingContext: PricingContext = _getPricingContext(serviceName, pricing, plan);

    if (subscription.addOns) {
      _applyAddOnsToPricingContext(serviceName, pricingContext, addOns!, subscription.addOns);
    }

    userConfigurationsByService[serviceName] = pricingContext;
  }

  return userConfigurationsByService;
}

function getFeatureEvaluationExpressionsByService(
  userPricings: Record<string, LeanPricing>,
  server: boolean
): Record<string, Record<string, string>> {
  const evaluationExpressionsByService: Record<string, Record<string, string>> = {};

  for (const [serviceName, pricing] of Object.entries(userPricings)) {
    evaluationExpressionsByService[serviceName] = {};

    for (const feature of Object.values(pricing.features)) {
      if (!feature.expression && !feature.serverExpression) {
        console.warn(
          `[WARNING] Feature ${feature.name} has no expression defined! It will always be evaluated as false`
        );

        continue;
      }

      const featureKey = feature.name;
      let expressionToUse = server && feature.serverExpression 
        ? (feature.serverExpression ?? feature.expression!) 
        : feature.expression!;
      
      expressionToUse = expressionToUse
        // Replace subscriptionContext['keyName'] with subscriptionContext['serviceName-keyName']
        .replace(/subscriptionContext\['([^']+)'\]/g, (match, key) => 
          `subscriptionContext['${serviceName.toLowerCase()}-${key}']`)
        // Replace pricingContext['features']['keyName'] with pricingContext['features']['serviceName-keyName']
        .replace(/pricingContext\['features'\]\['([^']+)'\]/g, (match, key) => 
          `pricingContext['features']['${serviceName.toLowerCase()}-${key}']`)
        // Replace pricingContext['usageLimits']['keyName'] with pricingContext['usageLimits']['serviceName-keyName']
        .replace(/pricingContext\['usageLimits'\]\['([^']+)'\]/g, (match, key) => 
          `pricingContext['usageLimits']['${serviceName.toLowerCase()}-${key}']`);

      evaluationExpressionsByService[serviceName][featureKey] = expressionToUse;
    }
  }

  return evaluationExpressionsByService;
}

function _applyAddOnsToPricingContext(
  serviceName: string,
  pricingContext: PricingContext,
  addOns: Record<string, LeanAddOn>,
  subscriptionAddOns: Record<string, number>
): void {
  for (const addOn of Object.values(addOns)) {
    if (addOn.features) {
      for (const [featureName, featureValue] of Object.entries(addOn.features)) {
        pricingContext.features[featureName] = featureValue;
      }
    }

    if (addOn.usageLimits) {
      for (const [usageLimitName, usageLimitValue] of Object.entries(addOn.usageLimits)) {
        pricingContext.usageLimits[usageLimitName] = usageLimitValue;
      }
    }

    if (addOn.usageLimitsExtensions) {
      for (const [usageLimitName, usageLimitValue] of Object.entries(addOn.usageLimitsExtensions)) {
        (pricingContext.usageLimits[usageLimitName] as number) +=
          usageLimitValue * subscriptionAddOns[addOn.name];
      }
    }
  }
}

function _getPricingContext(
  serviceName: string,
  pricing: LeanPricing,
  plan: LeanPlan | undefined
): PricingContext {
  if (!plan) {
    return {
      features: {},
      usageLimits: {},
    };
  }

  const features: Record<string, string | boolean> = {};
  const usageLimits: Record<string, boolean | number> = {};

  for (const feature of Object.values(pricing.features)) {
    features[feature.name] = plan.features[feature.name];
  }

  if (pricing.usageLimits) {
    for (const usageLimit of Object.values(pricing.usageLimits)) {
      usageLimits[usageLimit.name] = plan.usageLimits![usageLimit.name];
    }
  }

  return { features: features, usageLimits: usageLimits };
}

export {
  getUserSubscriptionsFromContract,
  mapSubscriptionsToConfigurationsByService,
  flattenUsageLevelsIntoSubscriptionContext,
  flattenConfigurationsIntoPricingContext,
  flattenFeatureEvaluationsIntoEvaluationContext,
  getFeatureEvaluationExpressionsByService
};
