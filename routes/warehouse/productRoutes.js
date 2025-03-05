import express from "express";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getStock,
  updateStock,
  getLowStockProducts
} from "../../controllers/warehouse/productController.js";

const router = express.Router();

// Product routes
router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
// Stock management routes
router.get("/:productId/stock", getStock);
router.put("/stock", updateStock);
router.get("/low-stock", getLowStockProducts);

export default router;
