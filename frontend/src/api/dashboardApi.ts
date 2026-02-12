import axios from '@/lib/axios';
import type { Analytic } from '@/types/Analytics';

// Obtiene el número total de contratos gestionados por SPACE
export async function getContractsCount(apiKey: string, organizationId: string): Promise<number> {
  const response = await axios.get(`/organizations/${organizationId}/contracts`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    params: { limit: 1 }, // Solo necesitamos el total
  });
  // El total se puede inferir del header X-Total-Count si está disponible, o del length
  if (Array.isArray(response.data)) {
    return response.data.length;
  }
  return 0;
}

// Obtiene el número total de servicios configurados
export async function getServicesCount(apiKey: string, organizationId: string): Promise<number> {
  const response = await axios.get(`/organizations/${organizationId}/services`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    params: { limit: 1 },
  });
  if (Array.isArray(response.data)) {
    return response.data.length;
  }
  return 0;
}

// Obtiene el número total de versiones de pricing activas
export async function getActivePricingsCount(apiKey: string, organizationId: string): Promise<number> {
  const response = await axios.get(`/organizations/${organizationId}/services`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    params: { limit: 1000 },
  });
  if (Array.isArray(response.data)) {
    let count = 0;
    for (const service of response.data) {
      if (service.activePricings) {
        count += Object.keys(service.activePricings).length;
      }
    }
    return count;
  }
  return 0;
}

// Obtiene las métricas de llamadas a la API y evaluaciones (simulado, requiere endpoint real)
export async function getApiCallsStats(apiKey: string): Promise<Analytic> {
  return axios.get('/analytics/api-calls', {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  }).then(response => {
    return response.data;
  }).catch(error => {
    console.error('Error fetching API calls stats:', error);
  });


  // return {
  //   labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  //   data: [120, 98, 150, 130, 170, 90, 110],
  // };
}

export async function getEvaluationsStats(apiKey: string): Promise<Analytic> {
  
  return axios.get('/analytics/evaluations', {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  }).then(response => {
    return response.data;
  }).catch(error => {
    console.error('Error fetching evaluations stats:', error);
  });

  // return {
  //   labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  //   data: [80, 70, 90, 60, 100, 50, 75],
  // };
}
