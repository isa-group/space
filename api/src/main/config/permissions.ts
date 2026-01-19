/**
 * Permission configuration for API routes
 * 
 * This file defines access control rules for both User API Keys and Organization API Keys.
 * 
 * Pattern matching:
 * - '*' matches any single path segment
 * - '**' matches any number of path segments (must be at the end)
 * 
 * Examples:
 * - '/users/*' matches '/users/john' but not '/users/john/profile'
 * - '/organizations/**' matches '/organizations/org1', '/organizations/org1/services', etc.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type UserRole = 'ADMIN' | 'USER';
export type OrganizationApiKeyRole = 'ALL' | 'MANAGEMENT' | 'EVALUATION';

export interface RoutePermission {
  path: string;
  methods: HttpMethod[];
  allowedUserRoles?: UserRole[];
  allowedOrgRoles?: OrganizationApiKeyRole[];
  requiresUser?: boolean; // If true, only user API keys are allowed (not org keys)
  isPublic?: boolean; // If true, no authentication required
}

/**
 * Route permission configuration
 * 
 * Rules are evaluated in order. The first matching rule determines access.
 * If no rule matches, access is denied by default.
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // ============================================
  // User Management Routes (User API Keys ONLY)
  // ============================================
  {
    path: '/users/authenticate',
    methods: ['POST'],
    isPublic: true,
  },
  {
    path: '/users/**',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedUserRoles: ['ADMIN', 'USER'],
    requiresUser: true, // Organization API keys cannot access user routes
  },

  // ============================================
  // Organization Management Routes (User API Keys ONLY)
  // ============================================
  {
    path: '/organizations/**',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedUserRoles: ['ADMIN', 'USER'],
    requiresUser: true, // Organization API keys cannot access these routes
  },

  // ============================================
  // Service Management Routes (Organization-scoped)
  // User API Keys can access via /organizations/:organizationId/services/**
  // ============================================
  {
    path: '/organizations/*/services',
    methods: ['GET', 'POST', 'DELETE'],
    allowedUserRoles: ['ADMIN', 'USER'],
    requiresUser: true,
  },
  {
    path: '/organizations/*/services/*',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    allowedUserRoles: ['ADMIN', 'USER'],
    requiresUser: true,
  },
  {
    path: '/organizations/*/services/*/pricings',
    methods: ['GET', 'POST'],
    allowedUserRoles: ['ADMIN', 'USER'],
    requiresUser: true,
  },
  {
    path: '/organizations/*/services/*/pricings/*',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    allowedUserRoles: ['ADMIN', 'USER'],
    requiresUser: true,
  },

  // ============================================
  // Service Management Routes (Direct access)
  // Organization API Keys can access via /services/**
  // ============================================
  {
    path: '/services',
    methods: ['GET'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT', 'EVALUATION'],
  },
  {
    path: '/services',
    methods: ['POST'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },
  {
    path: '/services/*',
    methods: ['GET'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT', 'EVALUATION'],
  },
  {
    path: '/services/*',
    methods: ['PUT', 'PATCH'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },
  {
    path: '/services/*',
    methods: ['DELETE'],
    allowedOrgRoles: ['ALL'],
  },
  {
    path: '/services/*/pricings',
    methods: ['GET', 'POST'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },
  {
    path: '/services/*/pricings/*',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },

  // ============================================
  // Contract Routes
  // ============================================
  {
    path: '/contracts',
    methods: ['GET'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },
  {
    path: '/contracts',
    methods: ['POST'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },
  {
    path: '/contracts/*',
    methods: ['GET', 'PUT', 'PATCH'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },
  {
    path: '/contracts/*',
    methods: ['DELETE'],
    allowedUserRoles: ['ADMIN'],
    allowedOrgRoles: ['ALL'],
  },

  // ============================================
  // Feature Evaluation Routes
  // ============================================
  {
    path: '/features/evaluate',
    methods: ['POST'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT', 'EVALUATION'],
  },
  {
    path: '/features/**',
    methods: ['GET'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT', 'EVALUATION'],
  },
  {
    path: '/features/**',
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },

  // ============================================
  // Analytics Routes
  // ============================================
  {
    path: '/analytics/**',
    methods: ['GET'],
    allowedUserRoles: ['ADMIN', 'USER'],
    allowedOrgRoles: ['ALL', 'MANAGEMENT'],
  },

  // ============================================
  // Health Check (Public)
  // ============================================
  {
    path: '/health',
    methods: ['GET'],
    isPublic: true, // No authentication required
  },
];

/**
 * Default denial message when no permission is granted
 */
export const DEFAULT_PERMISSION_DENIED_MESSAGE = 'You do not have permission to access this resource';

/**
 * Message when organization API key tries to access user-only routes
 */
export const ORG_KEY_USER_ROUTE_MESSAGE = 'This route requires a user API key. Organization API keys are not allowed';
