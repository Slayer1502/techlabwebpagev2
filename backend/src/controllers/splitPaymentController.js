const { splitPaymentService } = require("../services/splitPaymentService");
const notificationPush = require("../services/notificationPush");

const splitPaymentForService = async (req, res) => {
  try {
    const result = splitPaymentService({
      entityType: "service",
      entityId: req.params.id,
      entries: req.body.entries || req.body.splits,
      discount: req.body.discount,
    });
    notificationPush.pushAll();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const splitPaymentForOrder = async (req, res) => {
  try {
    const result = splitPaymentService({
      entityType: "order",
      entityId: req.params.id,
      entries: req.body.entries || req.body.splits,
    });
    notificationPush.pushAll();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { splitPaymentForService, splitPaymentForOrder };
