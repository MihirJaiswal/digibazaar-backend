import express from "express";
import { createStore } from "../../controllers/store/storeController.js";

const router = express.Router();

// Create Store Route
router.post("/", createStore);

export default router;
