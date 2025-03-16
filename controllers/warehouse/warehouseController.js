import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

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

export const createWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const contactInfo = req.body.contactInfo ? JSON.parse(req.body.contactInfo) : {};
    const coordinates = req.body.coordinates ? JSON.parse(req.body.coordinates) : {};
    const totalStock = req.body.totalStock ? parseFloat(req.body.totalStock) : 0;
    const usedCapacity = req.body.usedCapacity ? parseFloat(req.body.usedCapacity) : 0;
    const totalCapacity = req.body.capacity ? parseFloat(req.body.capacity) : 0;
    
    const availableCapacity = totalCapacity - usedCapacity;

    const store = await prisma.store.upsert({
      where: { ownerId: userId }, 
      update: {}, 
      create: {
        ownerId: userId,  
        name: req.body.storeName || "New Store",  
      },
    });

    const newWarehouse = await prisma.warehouse.create({
      data: {
        storeId: store.id,  
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

export const getWarehouses = async (req, res, next) => {
  try {
    const user = verifyToken(req); 
    console.log('user',user);
    const userId = user; 
    console.log('userId',userId);

    const warehouses = await prisma.warehouse.findMany({
      where: {
        Store: {
          ownerId: userId,  
        },
      },
    });

    res.status(200).json(warehouses);
  } catch (err) {
    next(err);
  }
};

export const getWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); 
    const userId = user;
    console.log('userId', userId);

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: req.params.id, 
        Store: {
          ownerId: userId,
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

export const updateWarehouse = async (req, res, next) => {
  try {
    const user = verifyToken(req); 
    const userId = user; 

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { Store: true }, 
    });

    if (!warehouse) return next(createError(404, "Warehouse not found"));
    
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
