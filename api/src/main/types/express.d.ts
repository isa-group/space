/**
 * TypeScript declaration file to extend Express types
 */

import { LeanUser } from './models/User';
import { OrganizationApiKeyRole } from '../config/permissions';

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated when authenticated with a User API Key
       * Contains user information including username, role, etc.
       */
      user?: LeanUser;

      /**
       * Populated when authenticated with an Organization API Key
       * Contains organization context and API key role
       */
      org?: {
        id: string;
        name: string;
        members: {username: string, role: string}[];
        role: OrganizationApiKeyRole;
      };

      /**
       * Indicates the type of authentication used
       */
      authType?: 'user' | 'organization';
    }
  }
}

export {};
