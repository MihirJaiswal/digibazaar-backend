import express from "express";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getStock,
  updateStock,
  getLowStockProducts,
  uploadProductImage
} from "../../controllers/warehouse/productController.js";
import {getProductsByStoreName} from "../../controllers/warehouse/productDisplay.js";

const router = express.Router();

// Product routes
router.post("/", uploadProductImage, createProduct);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
// Stock management routes
router.get("/:productId/stock", getStock);
router.put("/stock", updateStock);
router.get("/low-stock", getLowStockProducts);

export default router;
