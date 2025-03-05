import express from "express";
import {
  createVariant,
  getVariantsByProduct,
  updateVariant,
  deleteVariant
} from "../../controllers/warehouse/variantController.js";

const router = express.Router();

// Variant routes
router.post("/", createVariant);
router.get("/:productId", getVariantsByProduct);
router.put("/:id", updateVariant);
router.delete("/:id", deleteVariant);

export default router;
