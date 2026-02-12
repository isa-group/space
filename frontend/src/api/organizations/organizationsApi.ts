import axios from '@/lib/axios';
import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  AddMemberRequest,
  CreateApiKeyRequest,
} from '@/types/Organization';

const DEFAULT_TIMEOUT = 5000;

/**
 * Get all organizations for the authenticated user
 * For ADMIN users: fetches all organizations across all pages
 * For regular users: fetches only organizations where they are owner or member
 */
export async function getOrganizations(apiKey: string): Promise<Organization[]> {
  try {
    const response = await axios.get('/organizations', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    });

    // Check if response has pagination (ADMIN user)
    if (response.data.pagination) {
      const firstPageData = response.data.data;
      const totalOrganizations = response.data.pagination.total;
      const pageSize = response.data.pagination.limit;

      // If all organizations fit in first page, return them
      if (firstPageData.length >= totalOrganizations) {
        return firstPageData;
      }

      // Otherwise, fetch all remaining pages
      const allOrganizations: Organization[] = [...firstPageData];
      const totalPages = Math.ceil(totalOrganizations / pageSize);

      const remainingPagePromises = [];
      for (let page = 2; page <= totalPages; page++) {
        const offset = (page - 1) * pageSize;
        remainingPagePromises.push(
          axios.get('/organizations', {
            params: { offset, limit: pageSize },
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            timeout: DEFAULT_TIMEOUT,
          })
        );
      }

      const remainingPages = await Promise.all(remainingPagePromises);
      remainingPages.forEach(pageResponse => {
        allOrganizations.push(...pageResponse.data.data);
      });

      return allOrganizations;
    }

    // Regular user response (data array without pagination)
    return response.data.data || response.data;
  } catch (error: any) {
    console.error('Failed to fetch organizations:', error);
    throw new Error('Failed to fetch organizations. ' + (error.response?.data?.error || error.message));
  }
}

/**
 * Get paginated organizations (for admins)
 */
export async function getOrganizationsPaginated(
  apiKey: string,
  offset: number = 0,
  limit: number = 10,
  query?: string
): Promise<{ data: Organization[]; pagination: { offset: number; limit: number; total: number; page: number; pages: number } }> {
  const params: any = { offset, limit };
  if (query) {
    params.q = query;
  }

  return axios
    .get('/organizations', {
      params,
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
