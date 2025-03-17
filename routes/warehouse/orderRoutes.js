import express from "express";
import {
  createOrder,
  updateOrderStatus,
  assignStockToOrder,
  getOrders,
  getOrder,
  createPaymentIntentForProductOrder,
  getUserOrders
} from "../../controllers/warehouse/orderController.js";

const router = express.Router();

// Order management routes
router.post("/", createOrder);

//get all orders of a specific store
router.get("/", getOrders);
//get a single order by id
router.get("/:id", getOrder);
//update the status of an order
router.put("/:id/status", updateOrderStatus);
//assign stock to an order
router.post("/:id/assign-stock", assignStockToOrder);

// Create a payment intent
router.post("/payments/create-intent", createPaymentIntentForProductOrder);

router.get("/user/orders", getUserOrders);

export default router;
