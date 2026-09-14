import api from '../utils/api';

export interface FuelPrice {
  pricePerLitre: number;
  city: string;
  fuel: string;
  date: string;
}

export const fuelPriceService = {
  get: async (city?: string) => {
    const res = await api.get('/admin/fuel-prices', { params: city ? { city } : {} });
    return res.data as {
      city: string;
      petrol: FuelPrice | null;
      diesel: FuelPrice | null;
      cached: boolean;
    };
  },
};
