import express from "express";
import { createStore, getStore, getAllStores, updateStore, deleteStore, getStoreByName } from "../../controllers/store/storeController.js";
import { getThemeCustomization, createThemeCustomization, updateThemeCustomization, deleteThemeCustomization, getThemeCustomizationByStoreName } from "../../controllers/store/themeCustomizationController.js";

const router = express.Router();

// Create Store Route
router.post("/", createStore);

// Get Store Route
router.get("/", getStore);

// Get All Stores Route
router.get("/all", getAllStores);

// Update Store Route
router.put("/", updateStore);

// Delete Store Route
router.delete("/", deleteStore);

// Get Store by Name Route
router.get("/:name", getStoreByName);

// Theme Customization Routes
router.get("/theme-customization", getThemeCustomization);
router.post("/theme-customization", createThemeCustomization);
router.put("/theme-customization", updateThemeCustomization);
router.delete("/theme-customization", deleteThemeCustomization);

// Get Theme Customization by Store Name Route
router.get("/theme-customization/:name", getThemeCustomizationByStoreName);


export default router;
