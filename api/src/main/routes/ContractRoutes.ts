import express from 'express';

import ContractController from '../controllers/ContractController';
import * as ContractValidator from '../controllers/validation/ContractValidation';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware';
import { memberRole } from '../middlewares/AuthMiddleware';

const loadFileRoutes = function (app: express.Application) {
  const contractController = new ContractController();

  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';

  app
    .route(baseUrl + '/organizations/:organizationId/contracts')
    .get(memberRole, contractController.index)
    .post(memberRole, ContractValidator.create, handleValidation, contractController.create)
    .delete(memberRole, contractController.prune);
  
    app
    .route(baseUrl + '/organizations/:organizationId/contracts/:userId')
    .get(memberRole, contractController.show)
    .put(memberRole, ContractValidator.novate, handleValidation, contractController.novate)
    .delete(memberRole, contractController.destroy);
  
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
