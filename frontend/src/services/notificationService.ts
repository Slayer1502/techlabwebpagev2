import api from '../utils/api';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  link: string;
}

export const notificationService = {
  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res.data.notifications as Notification[];
  }
};
