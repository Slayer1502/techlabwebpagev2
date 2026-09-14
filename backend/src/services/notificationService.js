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

  // 3b. SLA breaches (Admin/Sales)
  if (['admin', 'sales'].includes(role)) {
    const sla = db.prepare(
      "SELECT customer_name, device_type, id FROM service_requests WHERE sla_breached = 1 AND status NOT IN ('Completed','Cancelled','Canceled')"
    ).all();
    sla.forEach(r => {
      notifications.push({
        id: `sla-${r.id}`,
        type: 'danger',
        title: 'SLA Breached',
        message: `SLA exceeded for ${r.customer_name} (${r.device_type})`,
        link: '/tickets'
      });
    });
  }

  // 3c. Low stock alerts (Admin/Sales)
  if (['admin', 'sales'].includes(role)) {
    const alerts = db.prepare(
      `SELECT sa.product_id, p.name, sa.current_stock FROM stock_alerts sa
       JOIN products p ON p.id = sa.product_id
       WHERE sa.alert_type = 'low_stock' AND sa.active = 1 AND sa.dismissed_at IS NULL`
    ).all();
    alerts.forEach(a => {
      notifications.push({
        id: `stock-${a.product_id}`,
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${a.name} is low on stock (${a.current_stock} left)`,
        link: '/inventory'
      });
    });
  }

  // 3c2. Pending Part Requests (Admin/Sales)
  if (['admin', 'sales'].includes(role)) {
    const partRequests = db.prepare(
      `SELECT id, customer_name, requested_parts, assigned_employee_name
       FROM service_requests
       WHERE part_request_status = 'requested'`
    ).all();
    partRequests.forEach(p => {
      let partSummary = 'Parts needed';
      try {
        const rp = JSON.parse(p.requested_parts);
        const items = (rp.inventory || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ');
        const proc = rp.procurement || '';
        partSummary = [items, proc].filter(Boolean).join(' + ');
        if (partSummary.length > 80) partSummary = partSummary.slice(0, 77) + '...';
      } catch {}
      notifications.push({
        id: `parts-${p.id}`,
        type: 'warning',
        title: 'Part Requested',
        message: `${p.assigned_employee_name || 'Tech'} needs parts for ${p.customer_name}: ${partSummary}`,
        link: '/tickets'
      });
    });
  }

  // 3d. Due recurring schedules (Admin/Sales)
  if (['admin', 'sales'].includes(role)) {
    const today = new Date().toISOString().slice(0, 10);
    const due = db.prepare(
      "SELECT customer_name, device_type, id, next_due_date FROM recurring_schedules WHERE active = 1 AND next_due_date <= ? LIMIT 10"
    ).all(today);
    due.forEach(r => {
      notifications.push({
        id: `recur-${r.id}`,
        type: 'warning',
        title: 'Recurring Service Due',
        message: `${r.customer_name} ${r.device_type ? '(' + r.device_type + ')' : ''} service due`,
        link: '/recurring-services'
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
