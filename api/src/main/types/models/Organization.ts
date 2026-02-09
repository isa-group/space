import { OrganizationApiKeyRole } from "../../types/permissions";

export interface LeanOrganization {
  id?: string;
  name: string;
  owner: string;
  default?: boolean;
  apiKeys: LeanApiKey[];
  members: OrganizationMember[];
}

export interface LeanApiKey {
  key: string;
  scope: OrganizationApiKeyRole;
}

export type OrganizationUserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EVALUATOR';

export interface OrganizationFilter {
  owner?: string;
  username?: string;
  default?: boolean;
}

export interface OrganizationMember {
  username: string;
  role: OrganizationUserRole;
}