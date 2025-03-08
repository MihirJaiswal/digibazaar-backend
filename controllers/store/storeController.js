import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";
import { storeUpload } from "../../config/cloudinary.config.js";

const prisma = new PrismaClient();

/**
 * Create a new store.
 */
export const uploadStoreImage = storeUpload.fields([
  { name: 'logo', maxCount: 1 }
]);

export const createStore = async (req, res, next) => {
  try {
    console.log("createStore called with body:", req.body);

    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token extracted:", token);
    if (!token) {
      console.error("Unauthorized! Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("Token decoded:", decoded);
    const userId = decoded.id;
    console.log("User ID:", userId);

    // Check if user already has a store (since each user can have only one store)
    const existingStore = await prisma.store.findUnique({
      where: { ownerId: userId },
    });
    console.log("Existing store for user:", existingStore);

    if (existingStore) {
      console.error("User already owns a store!");
      return next(createError(400, "User already owns a store!"));
    }

    // Use uploaded logo if available; otherwise, fall back to req.body.logo
    let logo = req.body.logo || "";
    if (req.files && req.files.logo && req.files.logo[0]) {
      logo = req.files.logo[0].path;
      console.log("Logo file path:", logo);
    }

    // Convert enableBlog and enableProductReviews to booleans
    const enableBlog = req.body.enableBlog === 'true';
    const enableProductReviews = req.body.enableProductReviews === 'true';

    // Create store
    const newStore = await prisma.store.create({
      data: {
        ownerId: userId,
        name: req.body.name,
        description: req.body.description || "",
        category: req.body.category || "OTHER",
        language: req.body.language || "EN",
        currency: req.body.currency || "INR",
        timezone: req.body.timezone || "UTC",
        enableBlog, // now a boolean
        enableProductReviews, // now a boolean
        theme: req.body.theme || "default",
        logo, // Updated to use file upload if available
        domain: req.body.domain || null, // Optional custom domain
        subdomain:
          req.body.subdomain ||
          `${req.body.name.toLowerCase().replace(/\s+/g, "-")}.mystore.com`,
      },
    });
    console.log("New store created:", newStore);
    res.status(201).json(newStore);
  } catch (err) {
    console.error("Error in createStore:", err);
    next(err);
  }
};

/**
 * Get the store for the authenticated user.
 */
export const getStore = async (req, res, next) => {
  try {
    console.log("getStore called with headers:", req.headers);
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token extracted:", token);
    if (!token) {
      console.error("Unauthorized! Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("Token decoded:", decoded);
    const userId = decoded.id;
    console.log("User ID:", userId);

    // Find the store belonging to the user
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
    });
    console.log("Store found:", store);

    if (!store) {
      console.error("Store not found for this user");
      return next(createError(404, "Store not found for this user"));
    }

    res.status(200).json(store);
  } catch (err) {
    console.error("Error in getStore:", err);
    next(err);
  }
};

/**
 * Get all stores.
 */
export const getAllStores = async (req, res, next) => {
  try {
    console.log("getAllStores called");
    const stores = await prisma.store.findMany();
    console.log("Stores retrieved:", stores);
    res.status(200).json(stores);
  } catch (err) {
    console.error("Error in getAllStores:", err);
    next(err);
  }
};

//get store by name
export const getStoreByName = async (req, res, next) => {
  try {
    const { name } = req.params;
    const store = await prisma.store.findUnique({
      where: { name },
    });
    res.status(200).json(store);
  } catch (err) {
    console.error("Error in getStoreByName:", err);
    next(err);
  }
};  


/**
 * Update a store for the authenticated user.
 */
export const updateStore = async (req, res, next) => {
  try {
    console.log("updateStore called with body:", req.body);
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token extracted:", token);
    if (!token) {
      console.error("Unauthorized! Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("Token decoded:", decoded);
    const userId = decoded.id;
    console.log("User ID:", userId);

    // Check if the store exists
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
    });
    console.log("Store before update:", store);

    if (!store) {
      console.error("Store not found for this user");
      return next(createError(404, "Store not found for this user"));
    }

    // Update store data; only update fields provided in req.body, otherwise fallback to the current value
    const updatedStore = await prisma.store.update({
      where: { ownerId: userId },
      data: {
        name: req.body.name || store.name,
        description: req.body.description || store.description,
        category: req.body.category || store.category,
        language: req.body.language || store.language,
        currency: req.body.currency || store.currency,
        timezone: req.body.timezone || store.timezone,
        isPublished: req.body.isPublished || store.isPublished,
        enableBlog:
          req.body.enableBlog !== undefined ? req.body.enableBlog : store.enableBlog,
        enableProductReviews:
          req.body.enableProductReviews !== undefined
            ? req.body.enableProductReviews
            : store.enableProductReviews,
        theme: req.body.theme || store.theme,
        logo: req.body.logo || store.logo,
        domain: req.body.domain || store.domain,
        subdomain: req.body.subdomain || store.subdomain,
      },
    });
    console.log("Updated store:", updatedStore);
    res.status(200).json(updatedStore);
  } catch (err) {
    console.error("Error in updateStore:", err);
    next(err);
  }
};

/**
 * Delete a store for the authenticated user.
 */
export const deleteStore = async (req, res, next) => {
  try {
    console.log("deleteStore called with headers:", req.headers);
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token extracted:", token);
    if (!token) {
      console.error("Unauthorized! Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("Token decoded:", decoded);
    const userId = decoded.id;
    console.log("User ID:", userId);

    // Check if the store exists
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
    });
    console.log("Store to delete:", store);

    if (!store) {
      console.error("Store not found for this user");
      return next(createError(404, "Store not found for this user"));
    }

    // Delete the store
    await prisma.store.delete({
      where: { ownerId: userId },
    });
    console.log("Store deleted successfully");
    res.status(200).json({ message: "Store deleted successfully" });
  } catch (err) {
    console.error("Error in deleteStore:", err);
    next(err);
  }
};
