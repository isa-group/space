import express from 'express';

import ContractController from '../controllers/ContractController';
import * as ContractValidator from '../controllers/validation/ContractValidation';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware';
import { hasPermission, memberRole } from '../middlewares/AuthMiddleware';

const loadFileRoutes = function (app: express.Application) {
  const contractController = new ContractController();

  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';

  app
    .route(baseUrl + '/organizations/:organizationId/contracts')
    .get(memberRole, hasPermission(['OWNER', 'ADMIN', 'MANAGER', 'EVALUATOR']), contractController.index)
    .post(memberRole, hasPermission(['OWNER', 'ADMIN', 'MANAGER']), ContractValidator.create, handleValidation, contractController.create)
    .delete(memberRole, hasPermission(['OWNER', 'ADMIN']), contractController.prune);
  
    app
    .route(baseUrl + '/organizations/:organizationId/contracts/:userId')
    .get(memberRole, hasPermission(['OWNER', 'ADMIN', 'MANAGER', 'EVALUATOR']), contractController.show)
    .put(memberRole, hasPermission(['OWNER', 'ADMIN', 'MANAGER']), ContractValidator.novate, handleValidation, contractController.novate)
    .delete(memberRole, hasPermission(['OWNER', 'ADMIN']), contractController.destroy);
  
    app
    .route(baseUrl + '/contracts')
    .get(contractController.index)
    .post(ContractValidator.create, handleValidation, contractController.create)
    .delete(contractController.prune);

  app
    .route(baseUrl + '/contracts/:userId')
    .get(contractController.show)
    .put(ContractValidator.novate, handleValidation, contractController.novate)
    .delete(contractController.destroy);
  
    app
    .route(baseUrl + '/contracts/:userId/usageLevels')
    .put(ContractValidator.incrementUsageLevels, handleValidation, contractController.resetUsageLevels);

    app
    .route(baseUrl + '/contracts/:userId/userContact')
    .put(ContractValidator.novateUserContact, handleValidation, contractController.novateUserContact);

    app
    .route(baseUrl + '/contracts/:userId/billingPeriod')
    .put(ContractValidator.novateBillingPeriod, handleValidation, contractController.novateBillingPeriod);
};

export default loadFileRoutes;
