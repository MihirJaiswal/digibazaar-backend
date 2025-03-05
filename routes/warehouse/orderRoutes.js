import express from "express";
import {
  createOrder,
  updateOrderStatus,
  assignStockToOrder,
  getOrders,
  getOrder
} from "../../controllers/warehouse/orderController.js";

const router = express.Router();

// Order management routes
router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.put("/:id/status", updateOrderStatus);
router.post("/assign-stock", assignStockToOrder);

export default router;
