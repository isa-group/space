import axios from "@/lib/axios";

const DEFAULT_TIMEOUT = 5000;

export async function getUsers(apiKey: string): Promise<Array<{ username: string; apiKey: string; role: 'ADMIN' | 'MANAGER' | 'EVALUATOR' }>> {
  return axios
    .get('/users', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to fetch users. ' + (error.response?.data?.error || error.message)
      );
    });
}

export async function updateUsername(apiKey: string, oldUsername: string, newUsername: string) {
  return axios
    .put(
      `/users/${oldUsername}`,
      { username: newUsername },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        timeout: DEFAULT_TIMEOUT,
      }
    )
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to update username. ' + (error.response?.data?.error || error.message)
      );
    });
}

export async function changeUserRole(apiKey: string, username: string, newRole: 'ADMIN' | 'MANAGER' | 'EVALUATOR') {
  return axios
    .put(
      `/users/${username}/role`,
      { role: newRole },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        timeout: DEFAULT_TIMEOUT,
      }
    )
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to change user role. ' + (error.response?.data?.error || error.message)
      );
    });
}

export async function changeUserPassword(apiKey: string, username: string, newPassword: string) {
  return axios
    .put(
      `/users/${username}`,
      { password: newPassword },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        timeout: DEFAULT_TIMEOUT,
      }
    )
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to change user password. ' + (error.response?.data?.error || error.message)
      );
    });
}

export async function deleteUser(apiKey: string, username: string) {
  return axios
    .delete(`/users/${username}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to delete user. ' + (error.response?.data?.error || error.message)
      );
    });
}

export async function createUser(apiKey: string, user: { username: string; password: string; role: 'ADMIN' | 'MANAGER' | 'EVALUATOR' }) {
  return axios
    .post('/users', user, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to create user. ' + (error.response?.data?.error || error.message)
      );
    });
}

export async function registerUser(user: { username: string; password: string }) {
  return axios
    .post('/users', { ...user, role: 'USER' }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        'Failed to register user. ' + (error.response?.data?.error || error.message)
      );
    });
}