import api from './api';

export const salesReturnService = {
  create: async (data: any) => {
    const response = await api.post('/sales-returns', data);
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/sales-returns');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/sales-returns/${id}`);
    return response.data;
  }
};
