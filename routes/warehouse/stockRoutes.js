import express from "express";
import {
  stockIn,
  stockOut,
  getStockMovements
} from "../../controllers/warehouse/stockController.js";

const router = express.Router();

// Stock management routes
router.post("/in", stockIn);
router.post("/out", stockOut);
router.get("/movements/:productId", getStockMovements);

export default router;
