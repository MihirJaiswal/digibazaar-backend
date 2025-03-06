import express from "express";
import {
  getStockReport,
  getSalesReport,
  getWarehouseUtilization,
  getLowStockAlerts
} from "../../controllers/warehouse/reportController.js";

const router = express.Router();

// Report routes
router.get("/stock", getStockReport);
router.get("/sales", getSalesReport); 
router.get("/utilization", getWarehouseUtilization);
router.get("/stock-alert", getLowStockAlerts)

export default router;
