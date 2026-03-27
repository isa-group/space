import express from 'express';
import AnalyticsController from '../controllers/AnalyticsController';

const loadFileRoutes = function (app: express.Application) {
  const analyticsController = new AnalyticsController();

  const baseUrl = '/api/v1';

  app
  .route(baseUrl + '/analytics/api-calls')
  .get(analyticsController.getApiCallsStats);

  app
  .route(baseUrl + '/analytics/evaluations')
  .get(analyticsController.getEvaluationsStats);

};

export default loadFileRoutes;
