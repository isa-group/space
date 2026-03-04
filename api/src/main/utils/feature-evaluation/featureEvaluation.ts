import container from '../../config/container';
import ContractService from '../../services/ContractService';
import {
  DetailedFeatureEvaluation,
  EvaluationContext,
  FeatureEvaluationResult,
  PricingContext,
  SimpleFeatureEvaluation,
  SubscriptionContext,
} from '../../types/models/FeatureEvaluation';

async function evaluateAllFeatures(
  pricingContext: PricingContext,
  subscriptionContext: SubscriptionContext,
  evaluationContext: EvaluationContext,
  simple: boolean = true
): Promise<SimpleFeatureEvaluation | DetailedFeatureEvaluation> {
  const features = Object.keys(evaluationContext);
  const result: SimpleFeatureEvaluation | DetailedFeatureEvaluation = {};

  for (const featureId of features) {
    result[featureId] = await evaluateFeature(
      featureId,
      pricingContext,
      subscriptionContext,
      evaluationContext,
      { simple: simple }
    );
  }

  return result;
}

async function evaluateFeature(
  featureId: string,
  pricingContext: PricingContext,
  subscriptionContext: SubscriptionContext,
  evaluationContext: EvaluationContext,
  options: { simple: boolean; expectedConsumption?: Record<string, number>; userId?: string } = {
    simple: true,
  }
): Promise<boolean | FeatureEvaluationResult> {
  const featureEvaluation: FeatureEvaluationResult = _evaluate(
    featureId,
    pricingContext,
    subscriptionContext,
    evaluationContext,
    options.expectedConsumption
  );

  if (featureEvaluation.eval && featureEvaluation.used !== null) {
    const expectedConsumption = options.expectedConsumption;

    if (expectedConsumption && Object.keys(expectedConsumption).length > 0) {
      // First validate all limits exist in expectedConsumption
      for (const limit in featureEvaluation.used) {
        if (expectedConsumption[limit] === undefined) {
          throw new Error(
            `Expected consumption for limit '${limit}' not provided. Please provide expected consumption for all limits involved in the evaluation of feature '${featureId}' or none at all.`
          );
        }
      }

      // Then apply all consumptions after validation has passed
      if (options.userId) {
        const contractService: ContractService = container.resolve('contractService');

        const limits = Object.keys(featureEvaluation.used);
        await Promise.all(
          limits.map(limit =>
            contractService._applyExpectedConsumption(
              options.userId!,
              limit,
              expectedConsumption[limit]
            )
          )
        );
      }
    }
  }

  if (options.simple) {
    return featureEvaluation.eval;
  } else {
    return featureEvaluation;
  }
}

function _evaluate(
  featureId: string,
  pricingContext: PricingContext,
  subscriptionContext: SubscriptionContext,
  evaluationContext: EvaluationContext,
  expectedConsumption?: Record<string, number>
): FeatureEvaluationResult {
  // Check if feature exists
  if (pricingContext.features[featureId] === undefined) {
    return _createErrorResult(
      'FLAG_NOT_FOUND',
      `Feature ${featureId} not found in "pricingContext".`
    );
  }

  const featureExpression: string | undefined = evaluationContext[featureId];

  // Validate feature expression
  const expressionError = validateExpression(featureId, featureExpression);
  if (expressionError) return expressionError;

  // Evaluate the expression
  try {
    const evalResult: boolean = eval(featureExpression!);

    if (typeof evalResult !== 'boolean') {
      return _createErrorResult(
        'TYPE_MISMATCH',
        `Feature ${featureId} has an expression that does not return a boolean! Returned value: ${evalResult} of type ${typeof evalResult}`
      );
    }

    if (evalResult === null || evalResult === undefined) {
      return _createErrorResult(
        'TYPE_MISMATCH',
        `Error while evaluating expression for feature ${featureId}. The returned expression is null or undefined`
      );
    }

    return _buildSuccessResult(
      featureId,
      featureExpression!,
      evalResult,
      pricingContext,
      subscriptionContext,
      expectedConsumption
    );
  } catch (error) {
    return _createErrorResult(
      'EVALUATION_ERROR',
      `Error evaluating feature ${featureId}: ${error}`
    );
  }
}

function _createErrorResult(code: string, message: string): FeatureEvaluationResult {
  console.warn(`[WARNING] ${message}`);
  return {
    eval: false,
    limit: null,
    used: null,
    error: { code, message },
  };
}

function validateExpression(
  featureId: string,
  expression?: string
): FeatureEvaluationResult | null {
  if (!expression) {
    return _createErrorResult('PARSE_ERROR', `Feature ${featureId} has no expression defined!`);
  }

  if (!expression.includes('pricingContext') && !expression.includes('subscriptionContext')) {
    return _createErrorResult(
      'PARSE_ERROR',
      `Feature ${featureId} has no expression defined! If an expression is intended, please ensure it only references hard-coded values or variables from "pricingContext" and "subscriptionContext".`
    );
  }

  return null;
}

function _buildSuccessResult(
  featureId: string,
  featureExpression: string,
  evalResult: boolean,
  pricingContext: PricingContext,
  subscriptionContext: SubscriptionContext,
  expectedConsumption?: Record<string, number>
): FeatureEvaluationResult {
  const limitsInvolvedInEvaluation = [
    ...featureExpression.matchAll(/subscriptionContext\['([^']+)'\]/g),
  ];

  const featureLimits: Record<string, number | boolean> = {};
  const usageLevels: Record<string, number> = {};

  for (const limit of limitsInvolvedInEvaluation) {
    const limitKey = limit[1];
    featureLimits[limitKey] = pricingContext.usageLimits[limitKey];

    if (expectedConsumption && Object.keys(expectedConsumption).length > 0) {
      const updatedUsageLevel = _updateUsageLevel(
        subscriptionContext[limitKey],
        expectedConsumption[limitKey]
      );
      if (!updatedUsageLevel) {
        return _createErrorResult(
          'INVALID_EXPECTED_CONSUMPTION',
          `No expectedConsumption value was provided for limit '${limitKey}', which is used in the evaluation of feature '${featureId}'. Please note that if you provide an expectedConsumption for any limit, you must provide it for all limits involved in that feature's evaluation.`
        );
      }
      usageLevels[limitKey] = updatedUsageLevel;
    } else {
      usageLevels[limitKey] = subscriptionContext[limitKey];
    }
  }

  return {
    eval: evalResult,
    limit: Object.keys(featureLimits).length === 0 ? null : featureLimits,
    used: Object.keys(usageLevels).length === 0 ? null : usageLevels,
    error: null,
  };
}

function _updateUsageLevel(
  currentUsageLevel: number,
  expectedConsumption?: number
): number | undefined {
  if (!expectedConsumption) {
    return undefined;
  }

  return currentUsageLevel + expectedConsumption;
}

export { evaluateAllFeatures, evaluateFeature };
