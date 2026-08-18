import api from './api';

export const purchaseReturnService = {
  create: async (data: any) => {
    const response = await api.post('/purchase-returns', data);
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/purchase-returns');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/purchase-returns/${id}`);
    return response.data;
  }
};
