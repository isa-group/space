import { Request, Response, NextFunction, Router } from 'express';
import container from '../config/container';
import { OrganizationMember } from '../types/models/Organization';
import { authenticateApiKeyMiddleware } from './AuthMiddleware';

// Public routes that won't require authentication
const PUBLIC_ROUTES = [
  '/users/authenticate',
  '/healthcheck'
];

/**
 * Middleware that applies authentication and permission verification to all routes
 * except those specified as public
 */
export const apiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';
  
  // Check if the current route is public (doesn't require authentication)
  const path = req.path.replace(baseUrl, '');
  const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route));
  
  if (isPublicRoute) {
    return next();
  }
  
  // Apply authentication and permission verification
  authenticateApiKeyMiddleware(req, res, (err?: any) => {
    next();
  });
};

export function hasUserRole(roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    } else {
      return res.status(403).send({ error: `Insufficient permissions. Required: ${roles.join(', ')}` });
    }
  }
}

export async function isOrgOwner(req: any, res: Response, next: NextFunction) {
  
  const organizationService = container.resolve('organizationService');

  const organizationId = req.params.organizationId;
  const organization = await organizationService.findById(organizationId);

  if (!organization) {
    return res.status(404).send({ error: `Organization with ID ${organizationId} not found` });
  }

  if (organization.owner === req.user.username || req.user.role === 'ADMIN') {
    return next();
  } else {
    return res.status(403).send({ error: `You are not the owner of organization ${organizationId}` });
  }
}

export async function isOrgMember(req: any, res: Response, next: NextFunction) {
  
  const organizationService = container.resolve('organizationService');

  const organizationId = req.params.organizationId;
  const organization = await organizationService.findById(organizationId);

  if (organization.owner === req.user.username || 
      organization.members.map((member: OrganizationMember) => member.username).includes(req.user.username) || 
      req.user.role === 'ADMIN') {
    return next();
  } else {
    return res.status(403).send({ error: `You are not a member of organization ${organizationId}` });
  }
}

export function hasOrgRole(roles: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    
    const organizationService = container.resolve('organizationService');
      
    const organizationId = req.params.organizationId;
    const organization = await organizationService.findById(organizationId);

    if (!organization) {
      return res.status(404).send({ error: `Organization with ID ${organizationId} not found` });
    }

    let userRoleInOrg = null;

    if (organization.owner === req.user.username) {
      userRoleInOrg = 'OWNER';
    } else {
      const member = organization.members.find((member: OrganizationMember) => member.username === req.user.username);
      if (member) {
        userRoleInOrg = member.role;
      }
    }

    if ((userRoleInOrg && roles.includes(userRoleInOrg)) || req.user.role === 'ADMIN') {
      return next();
    } else {
      return res.status(403).send({ error: `Insufficient organization permissions. Required: ${roles.join(', ')}` });
    }
  }
}