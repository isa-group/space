import { Module, RestOperation } from "./User";

export interface LeanOrganization {
  id: string;
  name: string;
  owner: string;
  apiKeys: LeanApiKey[];
  members: string[];
}

export interface LeanApiKey {
  key: string;
  scope: OrganizationKeyScope;
}

export type OrganizationRole = 'ADMIN' | 'MANAGER' | 'EVALUATOR';
export type OrganizationKeyScope = "ALL" | "MANAGEMENT" | "EVALUATION";

export interface RolePermissions {
  allowAll?: boolean;
  allowedMethods?: Partial<Record<RestOperation, Module[]>>;
  blockedMethods?: Partial<Record<RestOperation, Module[]>>;
}

export const ORGANIZATION_USER_ROLES: OrganizationRole[] = ['ADMIN', 'MANAGER', 'EVALUATOR'];
export const ORGANIZATION_API_KEY_ROLES: OrganizationKeyScope[] = ['ALL', 'MANAGEMENT', 'EVALUATION'];

export const USER_ROLE_PERMISSIONS: Record<OrganizationRole, RolePermissions> = {
  'ADMIN': {
    allowAll: true
  },
  'MANAGER': {
    blockedMethods: {
      'DELETE': ['*']
    }
  },
  'EVALUATOR': {
    allowedMethods: {
      'GET': ['services', 'features'],
      'POST': ['features']
    }
  }
};

export const API_KEY_ROLE_PERMISSIONS: Record<OrganizationKeyScope, RolePermissions> = {
  'ALL': {
    allowAll: true
  },
  'MANAGEMENT': {
    blockedMethods: {
      'DELETE': ['*']
    }
  },
  'EVALUATION': {
    allowedMethods: {
      'GET': ['services', 'features'],
      'POST': ['features']
    }
  }
};