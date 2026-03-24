import express from 'express';

import FeatureEvaluationController from '../controllers/FeatureEvaluationController';
import * as FeatureEvaluationValidation from '../controllers/validation/FeatureEvaluationValidation';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware';

const loadFileRoutes = function (app: express.Application) {
  const featureEvaluationController = new FeatureEvaluationController();

  const baseUrl = (process.env.BASE_URL_PATH ?? "") + '/api/v1';

  app
    .route(baseUrl + '/features')
    .get(featureEvaluationController.index);

  app
    .route(baseUrl + '/features/:userId')
    .post(featureEvaluationController.eval);

  app
    .route(baseUrl + '/features/:userId/pricing-token')
    .post(featureEvaluationController.generatePricingToken);

  app
    .route(baseUrl + '/features/:userId/:featureId')
    .post(FeatureEvaluationValidation.expectedConsumptionSingleFeature, handleValidation, featureEvaluationController.evalFeature);
};

export default loadFileRoutes;
