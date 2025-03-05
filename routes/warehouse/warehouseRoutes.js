import express from "express";
import {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  deleteWarehouse,
  getWarehouseStock,
  assignProductLocation
} from "../../controllers/warehouse/warehouseController.js";

const router = express.Router();

// Warehouse management routes
router.post("/", createWarehouse);
router.get("/", getWarehouses);
router.get("/:id", getWarehouse);
router.delete("/:id", deleteWarehouse);
router.get("/:id/stock", getWarehouseStock);
router.post("/assign-location", assignProductLocation);

export default router;
