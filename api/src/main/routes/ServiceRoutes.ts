import express from 'express';

import ServiceController from '../controllers/ServiceController';
import * as ServiceValidator from '../controllers/validation/ServiceValidation';
import * as PricingValidator from '../controllers/validation/PricingValidation';
import { handlePricingUpload } from '../middlewares/FileHandlerMiddleware';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware';
import { memberRole, hasPermission } from '../middlewares/AuthMiddleware';

const loadFileRoutes = function (app: express.Application) {
  const serviceController = new ServiceController();
  const upload = handlePricingUpload(['pricing'], './public/static/pricings/uploaded');

  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';

  // ============================================
  // Organization-scoped routes (User API Keys)
  // Accessible to authenticated users
  // ============================================

  app
    .route(baseUrl + '/organizations/:organizationId/services')
    .get(memberRole, hasPermission(['ADMIN', 'MANAGER', 'EVALUATOR']), serviceController.index)
    .post(memberRole, hasPermission(['ADMIN', 'MANAGER']), upload, serviceController.create)
    .delete(memberRole, hasPermission(['ADMIN']), serviceController.prune);
  
  app
    .route(baseUrl + '/organizations/:organizationId/services/:serviceName')
    .get(memberRole, hasPermission(['ADMIN', 'MANAGER', 'EVALUATOR']), serviceController.show)
    .put(memberRole, hasPermission(['ADMIN', 'MANAGER']), ServiceValidator.update, handleValidation, serviceController.update)
    .delete(memberRole, hasPermission(['ADMIN']), serviceController.disable);

  app
    .route(baseUrl + '/organizations/:organizationId/services/:serviceName/pricings')
    .get(memberRole, hasPermission(['ADMIN', 'MANAGER', 'EVALUATOR']), serviceController.indexPricings)
    .post(memberRole, hasPermission(['ADMIN', 'MANAGER']), upload, serviceController.addPricingToService);

  app
    .route(baseUrl + '/organizations/:organizationId/services/:serviceName/pricings/:pricingVersion')
    .get(memberRole, hasPermission(['ADMIN', 'MANAGER', 'EVALUATOR']), serviceController.showPricing)
    .put(memberRole, hasPermission(['ADMIN', 'MANAGER']), PricingValidator.updateAvailability, handleValidation, serviceController.updatePricingAvailability)
    .delete(memberRole, hasPermission(['ADMIN']), serviceController.destroyPricing);

  // ============================================
  // Direct service routes (Organization API Keys)
  // Accessible to organization API keys only
  // ============================================

  app
    .route(baseUrl + '/services')
    .get(serviceController.index)
    .post(upload, serviceController.create)
    .delete(serviceController.prune);
  
  app
    .route(baseUrl + '/services/:serviceName')
    .get(serviceController.show)
    .put(ServiceValidator.update, handleValidation, serviceController.update)
    .delete(serviceController.disable);

  app
    .route(baseUrl + '/services/:serviceName/pricings')
    .get(serviceController.indexPricings)
    .post(upload, serviceController.addPricingToService);

  app
    .route(baseUrl + '/services/:serviceName/pricings/:pricingVersion')
    .get(serviceController.showPricing)
    .put(PricingValidator.updateAvailability, handleValidation, serviceController.updatePricingAvailability)
    .delete(serviceController.destroyPricing);
};

export default loadFileRoutes;
