import axios from '@/lib/axios';
import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  AddMemberRequest,
  CreateApiKeyRequest,
  OrganizationApiKey
} from '@/types/Organization';

const DEFAULT_TIMEOUT = 5000;

/**
 * Get all organizations for the authenticated user
 */
export async function getOrganizations(apiKey: string): Promise<Organization[]> {
  return axios
    .get('/organizations', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to fetch organizations:', error);
      throw new Error('Failed to fetch organizations. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Get a specific organization by ID
 */
export async function getOrganization(apiKey: string, organizationId: string): Promise<Organization> {
  return axios
    .get(`/organizations/${organizationId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to fetch organization:', error);
      throw new Error('Failed to fetch organization. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Create a new organization
 */
export async function createOrganization(
  apiKey: string,
  data: CreateOrganizationRequest
): Promise<Organization> {
  return axios
    .post('/organizations', data, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to create organization:', error);
      throw new Error('Failed to create organization. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Update organization details
 */
export async function updateOrganization(
  apiKey: string,
  organizationId: string,
  data: UpdateOrganizationRequest
): Promise<Organization> {
  return axios
    .put(`/organizations/${organizationId}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to update organization:', error);
      throw new Error('Failed to update organization. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Delete an organization
 */
export async function deleteOrganization(apiKey: string, organizationId: string): Promise<void> {
  return axios
    .delete(`/organizations/${organizationId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(() => undefined)
    .catch(error => {
      console.error('Failed to delete organization:', error);
      throw new Error('Failed to delete organization. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Add a member to the organization
 */
export async function addMember(
  apiKey: string,
  organizationId: string,
  data: AddMemberRequest
): Promise<Organization> {
  return axios
    .post(`/organizations/${organizationId}/members`, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to add member:', error);
      throw new Error('Failed to add member. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Remove a member from the organization
 */
export async function removeMember(
  apiKey: string,
  organizationId: string,
  username: string
): Promise<Organization> {
  return axios
    .delete(`/organizations/${organizationId}/members/${username}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to remove member:', error);
      throw new Error('Failed to remove member. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Update a member's role in the organization
 */
export async function updateMemberRole(
  apiKey: string,
  organizationId: string,
  username: string,
  role: 'ADMIN' | 'MANAGER' | 'EVALUATOR'
): Promise<Organization> {
  return axios
    .put(`/organizations/${organizationId}/members/${username}`, { role }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to update member role:', error);
      throw new Error('Failed to update member role. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Create an API key for the organization
 */
export async function createApiKey(
  apiKey: string,
  organizationId: string,
  data: CreateApiKeyRequest
): Promise<Organization> {
  return axios
    .post(`/organizations/${organizationId}/api-keys`, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to create API key:', error);
      throw new Error('Failed to create API key. ' + (error.response?.data?.error || error.message));
    });
}

/**
 * Delete an API key from the organization
 */
export async function deleteApiKey(
  apiKey: string,
  organizationId: string,
  apiKeyToDelete: string
): Promise<Organization> {
  return axios
    .delete(`/organizations/${organizationId}/api-keys/${apiKeyToDelete}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to delete API key:', error);
      throw new Error('Failed to delete API key. ' + (error.response?.data?.error || error.message));
    });
}
