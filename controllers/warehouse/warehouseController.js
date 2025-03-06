import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Function to verify the JWT token and get user details
 */
const verifyToken = (req) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token && req.cookies?.__session) {
    token = req.cookies.__session;
  }
  if (!token) throw createError(401, "Access denied. No token provided.");
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    return decoded.id;
  } catch (error) {
    console.log(error);
    console.log(token);
    throw createError(403, "Invalid token");
  }
};

/**
 * Create a new warehouse (Only authenticated users).
 */
export const createWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    // Ensure proper types and set defaults
    const contactInfo = req.body.contactInfo ? JSON.parse(req.body.contactInfo) : {};
    const coordinates = req.body.coordinates ? JSON.parse(req.body.coordinates) : {};
    const totalStock = req.body.totalStock ? parseFloat(req.body.totalStock) : 0;
    const usedCapacity = req.body.usedCapacity ? parseFloat(req.body.usedCapacity) : 0;
    const totalCapacity = req.body.capacity ? parseFloat(req.body.capacity) : 0;
    
    // Calculate available capacity dynamically
    const availableCapacity = totalCapacity - usedCapacity;

    // Find or create a Store for the user
    const store = await prisma.store.upsert({
      where: { ownerId: userId },  // Use the userId to find the associated store
      update: {}, // No need to update anything if it exists
      create: {
        ownerId: userId,  // Create a new store for the user if not found
        name: req.body.storeName || "New Store",  // Provide a store name or default
      },
    });

    // Create a new warehouse linked to the store
    const newWarehouse = await prisma.warehouse.create({
      data: {
        storeId: store.id,  // Associate warehouse with the store
        name: req.body.name,
        location: req.body.location,
        capacity: totalCapacity,
        contactInfo,
        coordinates,
        totalStock,
        availableCapacity,
        usedCapacity,
      },
    });

    res.status(201).json(newWarehouse);
  } catch (err) {
    next(err);
  }
};



//get all warehouses for a user
export const getWarehouses = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    console.log('user',user);
    const userId = user; // Get the user ID from the token
    console.log('userId',userId);

    // Fetch only the warehouses owned by the authenticated user
    const warehouses = await prisma.warehouse.findMany({
      where: {
        Store: {
          ownerId: userId,  // Ensure the user can only access their own warehouses
        },// Filter warehouses by the authenticated user's ID
      },
    });

    res.status(200).json(warehouses);
  } catch (err) {
    next(err);
  }
};


/**
 * Get a single warehouse by ID (Only if the user owns it).
 */
export const getWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    console.log('userId', userId);

    // Fetch the warehouse owned by the authenticated user
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: req.params.id, // Specific warehouse ID
        Store: {
          ownerId: userId, // Ensure the user can only access their own warehouse
        },
      },
      include: { 
        inventories: true, 
        shipments: true 
      },
    });

    if (!warehouse) return next(createError(404, "Warehouse not found!"));
    res.status(200).json(warehouse);
  } catch (err) {
    next(err);
  }
};


/**
 * Update a warehouse (Only warehouse owner).
 */
export const updateWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    // Find the warehouse with its related store
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { Store: true }, // Include the store relationship
    });

    if (!warehouse) return next(createError(404, "Warehouse not found"));
    
    // Check if the store's owner matches the current user
    if (warehouse.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this warehouse"));
    }

    // Update the warehouse
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.status(200).json(updatedWarehouse);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a warehouse (Only warehouse owner).
 */
export const deleteWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
    });

    if (!warehouse) return next(createError(404, "Warehouse not found"));
    if (warehouse.ownerId !== userId) {
      return next(createError(403, "You are not authorized to delete this warehouse"));
    }

    await prisma.warehouse.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Warehouse has been deleted!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get stock levels in a warehouse (Only warehouse owner).
 */
export const getWarehouseStock = async (req, res, next) => {
  try {
    console.log("Starting getWarehouseStock function");
    const user = verifyToken(req); 
    console.log("User ID from token:", user);
    const userId = user;
    
    console.log("Looking for warehouse with ID:", req.params.id, "and owner:", userId);
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: req.params.id,
        Store: {
          ownerId: userId,
        },
      },
    });
    
    console.log("Warehouse found:", warehouse ? "Yes" : "No");
    if (!warehouse) return next(createError(404, "Warehouse not found or you don't have access"));

    // Get the stock information
    const stock = await prisma.inventory.findMany({
      where: { warehouseId: req.params.id },
      include: { product: true },
    });

    res.status(200).json(stock);
  } catch (err) {
    console.error("Error in getWarehouseStock:", err);
    next(err);
  }
};
/**
 * Assign product location in warehouse (Only warehouse owner).
 */
export const assignProductLocation = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { warehouseId, productId, location } = req.body;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) return next(createError(404, "Warehouse not found"));
    if (warehouse.ownerId !== userId) {
      return next(createError(403, "You are not authorized to modify this warehouse"));
    }

    const updatedInventory = await prisma.inventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { location },
    });

    res.status(200).json(updatedInventory);
  } catch (err) {
    next(err);
  }
};
