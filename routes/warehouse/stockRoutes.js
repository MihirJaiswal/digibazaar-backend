import express from "express";
import {
  stockIn,
  stockOut,
  getStockMovements,
  getProductInventory,
  getWarehouseInventory
} from "../../controllers/warehouse/stockController.js";

const router = express.Router();

// Stock management routes
router.post("/in", stockIn);
router.post("/out", stockOut);
router.get("/movements/:productId", getStockMovements);
router.get("/product/:productId", getProductInventory);
router.get("/warehouse/:warehouseId", getWarehouseInventory);
export default router;
