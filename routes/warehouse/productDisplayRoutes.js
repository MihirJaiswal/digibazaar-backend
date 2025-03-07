
import { getProductsByStoreName } from "../../controllers/warehouse/productDisplay.js";
import express from "express";

const router = express.Router();

router.get("/store/:storeName", getProductsByStoreName);

export default router;