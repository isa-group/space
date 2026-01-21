import { OrganizationApiKeyRole } from "../../types/permissions";

export interface LeanOrganization {
  id: string;
  name: string;
  owner: string;
  apiKeys: LeanApiKey[];
  members: string[];
}

export interface LeanApiKey {
  key: string;
  scope: OrganizationApiKeyRole;
}

export type OrganizationUserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EVALUATOR';

export interface OrganizationFilter {
  owner?: string;
}

export interface OrganizationMember {
  username: string;
  role: OrganizationUserRole;
}