import express from "express";
import {
  getShippingMethods,
  createShipment,
  updateShipmentStatus,
  getShipmentDetails,
  
} from "../../controllers/warehouse/shipmentController.js";
import { verifyToken } from "../../middleware/jwt.js";

const router = express.Router();

// Get all shipping methods (Auth Required)
router.get("/shipping-methods", getShippingMethods);

// Create a shipment (Assign warehouse & method) - Protected
router.post("/orders/:id/ship", verifyToken, createShipment);

// Update shipment tracking status - Protected
router.put("/orders/:id/track", verifyToken, updateShipmentStatus);

// Get shipment details - Protected
router.get("/orders/:id/shipment", verifyToken, getShipmentDetails);

export default router;
