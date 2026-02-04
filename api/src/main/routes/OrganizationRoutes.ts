import express from 'express';

import * as OrganizationValidation from '../controllers/validation/OrganizationValidation';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware';
import OrganizationController from '../controllers/OrganizationController';
import { hasOrgRole, isOrgOwner } from '../middlewares/ApiKeyAuthMiddleware';

const loadFileRoutes = function (app: express.Application) {
  const organizationController = new OrganizationController();
  
  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';

  // Public route for authentication (does not require API Key)
  app
    .route(`${baseUrl}/organizations/`)
    .get(
      organizationController.getAllOrganizations
    )
    .post(
      OrganizationValidation.create,
      handleValidation,
      organizationController.createOrganization
    );
  
    
    app
    .route(`${baseUrl}/organizations/:organizationId`)
    .get(
      OrganizationValidation.getById,
      handleValidation,
      organizationController.getOrganizationById
    )
    .put(
      OrganizationValidation.update,
      handleValidation,
      isOrgOwner,
      organizationController.update
    ).delete(
      OrganizationValidation.getById,
      handleValidation,
      isOrgOwner,
      organizationController.delete
    );

    app
      .route(`${baseUrl}/organizations/:organizationId/members`)
      .post(
        OrganizationValidation.getById,
        OrganizationValidation.addMember,
        handleValidation,
        hasOrgRole(["OWNER", "ADMIN", "MANAGER"]),
        organizationController.addMember
      )
      .delete(
        OrganizationValidation.getById,
        handleValidation,
        hasOrgRole(["OWNER", "ADMIN", "MANAGER"]),
        organizationController.removeMember
      );
    
      app
      .route(`${baseUrl}/organizations/:organizationId/api-keys`)
      .post(
        OrganizationValidation.getById,
        handleValidation,
        hasOrgRole(["OWNER", "ADMIN", "MANAGER"]),
        organizationController.addApiKey
      )
      .delete(
        OrganizationValidation.getById,
        handleValidation,
        hasOrgRole(["OWNER", "ADMIN", "MANAGER"]),
        organizationController.removeApiKey
      );
};

export default loadFileRoutes;
