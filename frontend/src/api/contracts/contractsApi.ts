import axios from '@/lib/axios';
import type { Subscription } from '../../types/Subscription';

const DEFAULT_TIMEOUT = 8000;

/**
 * Fetch contracts from server. Supports passing a request body (the API declares a GET with requestBody).
 * Returns { data: Subscription[], total?: number }
 */
export async function getContracts(
  apiKey: string,
  params: Record<string, any> = {},
  body: any = undefined
): Promise<{ data: Subscription[]; total?: number }> {
  try {
    const response = await axios.request({
      url: '/contracts',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      params,
      data: body,
      timeout: DEFAULT_TIMEOUT,
    });

    const totalHeader = response.headers?.['x-total-count'] ?? response.headers?.['X-Total-Count'];
    const total = totalHeader ? Number(totalHeader) : undefined;
    return { data: response.data as Subscription[], total };
  } catch (error) {
    console.error('Failed to fetch contracts', error);
    throw new Error('Failed to fetch contracts');
  }
}
