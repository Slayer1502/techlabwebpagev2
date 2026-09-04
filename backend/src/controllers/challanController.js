const challanService = require("../services/challanService");

const createChallan = async (req, res) => {
  try {
    const result = challanService.createOrUpdateChallan(req.body, req.user ? req.user.id : null);
    res.json({
      id: result.challanId,
      challan_number: result.challanNumber,
      source_type: req.body.sourceType,
      source_id: req.body.sourceId,
      dispatch_date: result.dispatchDateValue,
      receiver_name: result.receiver,
      items: result.items,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getChallans = async (req, res) => {
  const data = challanService.getChallans(req.query);
  res.json(req.query.sourceType && req.query.sourceId ? data : { challans: data });
};

const createStandaloneChallan = async (req, res) => {
  try {
    const result = challanService.createStandaloneChallan(req.body, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const returnChallanItems = async (req, res) => {
  try {
    challanService.returnChallanItems(req.params.id, req.body.returns);
    res.json({ message: "Items returned and stock updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const consolidateToBill = async (req, res) => {
  try {
    const { ids, isGst } = req.body;
    if (!Array.isArray(ids) || ids.length < 2) {
      return res.status(400).json({ error: "Select at least 2 challans to consolidate" });
    }
    const orderId = challanService.consolidateChallansToBill(ids, isGst);
    res.json({ message: "Challans consolidated successfully", orderId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getChallanDetail = async (req, res) => {
    const data = challanService.getChallanById(req.params.id);
    if (!data) return res.status(404).json({ error: "Challan not found" });
    res.json(data);
};

module.exports = {
  createChallan,
  getChallans,
  createStandaloneChallan,
  returnChallanItems,
  consolidateToBill,
  getChallanDetail
};
