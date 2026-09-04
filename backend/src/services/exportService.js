const { db } = require("../../db");

const exportOrders = () => {
    return db.prepare("SELECT * FROM product_orders ORDER BY created_at DESC").all();
};

const exportRequests = () => {
    return db.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all();
};

const exportProducts = () => {
    return db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY name").all();
};

module.exports = {
    exportOrders,
    exportRequests,
    exportProducts
};
