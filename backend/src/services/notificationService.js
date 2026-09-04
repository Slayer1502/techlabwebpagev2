const { db } = require("../../db");

const getNotifications = (role, userId) => {
  const notifications = [];

  // 1. Pending Service Requests (Admin/Sales)
  if (['admin', 'sales'].includes(role)) {
    const pending = db.prepare("SELECT customer_name, device_type FROM service_requests WHERE status = 'Pending'").all();
    pending.forEach(r => {
      notifications.push({
        id: `req-${r.customer_name}-${r.device_type}`,
        type: 'info',
        title: 'New Service Request',
        message: `${r.customer_name} booked a ${r.device_type} visit`,
        link: '/tickets'
      });
    });
  }

  // 3. Unpaid Bills (Admin/Sales)
  if (['admin', 'sales'].includes(role)) {
      const unpaid = db.prepare("SELECT customer_name, bill_amount FROM service_requests WHERE bill_status = 'billed' AND payment_status != 'paid'").all();
      unpaid.forEach(u => {
          notifications.push({
              id: `pmt-${u.customer_name}`,
              type: 'danger',
              title: 'Pending Payment',
              message: `${u.customer_name} has an unpaid bill of Rs. ${u.bill_amount}`,
              link: '/tickets'
          });
      });
  }

  // 4. Technician Assignments (Technician)
  if (role === 'technician') {
      const tasks = db.prepare("SELECT customer_name FROM service_requests WHERE assigned_employee_id = ? AND status = 'Scheduled'").all(userId);
      tasks.forEach(t => {
          notifications.push({
              id: `task-${t.customer_name}`,
              type: 'success',
              title: 'New Task Assigned',
              message: `You have a scheduled visit for ${t.customer_name}`,
              link: '/dashboard'
          });
      });
  }

  return notifications;
};

module.exports = {
  getNotifications
};
