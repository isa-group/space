import { Request, Response, NextFunction } from 'express';
import container from '../config/container';
import { 
  ROUTE_PERMISSIONS, 
  DEFAULT_PERMISSION_DENIED_MESSAGE,
  ORG_KEY_USER_ROUTE_MESSAGE,
} from '../config/permissions';
import { matchPath, extractApiPath } from '../utils/routeMatcher';
import { OrganizationMember, OrganizationUserRole } from '../types/models/Organization';
import { HttpMethod, OrganizationApiKeyRole } from '../types/permissions';

/**
 * Middleware to authenticate API Keys (both User and Organization types)
 * 
 * Supports two types of API Keys:
 * 1. User API Keys (prefix: "usr_") - Authenticates a specific user
 * 2. Organization API Keys (prefix: "org_") - Authenticates at organization level
 * 
 * Sets req.user for User API Keys
 * Sets req.org for Organization API Keys
 */
const authenticateApiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    // Allow request to continue - checkPermissions will verify if route is public
    return next();
  }

  try {
    // Determine API Key type based on prefix
    if (apiKey.startsWith('usr_')) {
      // User API Key authentication
      await authenticateUserApiKey(req, apiKey);
    } else if (apiKey.startsWith('org_')) {
      // Organization API Key authentication
      await authenticateOrgApiKey(req, apiKey);
    } else {
      return res.status(401).json({ 
        error: 'Invalid API Key format. API Keys must start with "usr_" or "org_"' 
      });
    }

    checkPermissions(req, res, next);
  } catch (err: any) {
    return res.status(401).json({ 
      error: err.message || 'Invalid API Key' 
    });
  }
};

/**
 * Authenticates a User API Key and populates req.user
 */
async function authenticateUserApiKey(req: Request, apiKey: string): Promise<void> {
  const userService = container.resolve('userService');
  
  const user = await userService.findByApiKey(apiKey);
  
  if (!user) {
    throw new Error('Invalid User API Key');
  }

  req.user = user;
  req.authType = 'user';
}

/**
 * Authenticates an Organization API Key and populates req.org
 */
async function authenticateOrgApiKey(req: Request, apiKey: string): Promise<void> {
  const organizationService = container.resolve('organizationService');
  
  // Find organization by API Key
  const result = await organizationService.findByApiKey(apiKey);
  
  if (!result || !result.organization || !result.apiKeyData) {
    throw new Error('Invalid Organization API Key');
  }

  req.org = {
    id: result.organization.id,
    name: result.organization.name,
    members: result.organization.members,
    role: result.apiKeyData.scope as OrganizationApiKeyRole,
  };
  req.authType = 'organization';
  req.params.organizationId = result.organization.id;
}

/**
 * Middleware to verify permissions based on route configuration
 * 
 * Checks if the authenticated entity (user or organization) has permission
 * to access the requested route with the specified HTTP method.
 * 
 * Must be used AFTER authenticateApiKey middleware.
 */
const checkPermissions = (req: Request, res: Response, next: NextFunction) => {
  try {
    const method = req.method.toUpperCase() as HttpMethod;
    const baseUrlPath = process.env.BASE_URL_PATH || '/api/v1';
    const apiPath = extractApiPath(req.path, baseUrlPath);

    // Find matching permission rule
    const matchingRule = ROUTE_PERMISSIONS.find(rule => {
      const methodMatches = rule.methods.includes(method);
      const pathMatches = matchPath(rule.path, apiPath);
      return methodMatches && pathMatches;
    });

    // If no rule matches, deny by default
    if (!matchingRule) {
      return res.status(403).json({ 
        error: DEFAULT_PERMISSION_DENIED_MESSAGE,
        details: `No permission rule found for ${method} ${apiPath}`
      });
    }

    // Allow public routes without authentication
    if (matchingRule.isPublic) {
      return next();
    }

    // Protected route - require authentication
    if (!req.authType) {
      return res.status(401).json({ 
        error: 'API Key not found. Please ensure to add an API Key as value of the "x-api-key" header.'
      });
    }

    // Check if this route requires a user API key
    if (matchingRule.requiresUser && req.authType === 'organization') {
      return res.status(403).json({ 
        error: ORG_KEY_USER_ROUTE_MESSAGE 
      });
    }

    // Verify permissions based on auth type
    if (req.authType === 'user' && req.user) {
      // User API Key - check user role
      if (!matchingRule.allowedUserRoles || !matchingRule.allowedUserRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: `Your user role (${req.user.role}) does not have permission to ${method} ${apiPath}` 
        });
      }
    } else if (req.authType === 'organization' && req.org) {
      // Organization API Key - check org key role
      if (!matchingRule.allowedOrgRoles || !matchingRule.allowedOrgRoles.includes(req.org.role)) {
        return res.status(403).json({ 
          error: `Your organization API key role (${req.org.role}) does not have permission to ${method} ${apiPath}` 
        });
      }
    } else {
      // No valid authentication found
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    // Permission granted
    next();
  } catch (error) {
    console.error('Error checking permissions:', error);
    return res.status(500).json({ 
      error: 'Internal error while verifying permissions' 
    });
  }
};

const memberRole = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user && !req.org) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  if (req.authType === 'user'){
    const organizationService = container.resolve('organizationService');
    const organizationId = req.params.organizationId;
    const service = await organizationService.findByName(organizationId);

    const member = service.members.find((member: OrganizationMember) => member.username === req.user!.username)

    if (member) {
      req.user!.orgRole = member.role as OrganizationUserRole;
    }
  }else{
    next();
  }
}

const hasPermission = (requiredRoles: (OrganizationApiKeyRole | OrganizationUserRole)[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.orgRole) {
      return res.status(401).json({ 
        error: 'This route requires user authentication' 
      });
    }

    if (!requiredRoles.includes(req.user!.orgRole as OrganizationUserRole)) {
      return res.status(403).json({ 
        error: 'You do not have permission to access this resource. Allowed roles: ' + requiredRoles.join(', ')
      });
    }

    next();
  }
}

export { authenticateApiKeyMiddleware, memberRole, hasPermission };
