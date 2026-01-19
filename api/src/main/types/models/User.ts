export interface LeanUser {
  id: string;
  username: string;
  password: string;
  apiKey: string;
  role: UserRole;
}

export type UserRole = 'ADMIN' | 'USER';
export type Module = 'users' | 'services' | 'contracts' | 'features' | '*';
export type RestOperation = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RolePermissions {
  allowAll?: boolean;
  allowedMethods?: Partial<Record<RestOperation, Module[]>>;
  blockedMethods?: Partial<Record<RestOperation, Module[]>>;
}

export const USER_ROLES: UserRole[] = ['ADMIN', 'USER'];

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  'ADMIN': {
    allowAll: true
  },
  'USER': {
    allowAll: true,
  },
};