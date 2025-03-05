import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Create a new warehouse.
 */
export const createWarehouse = async (req, res, next) => {
  try {
    // Ensure proper types and set defaults
    const contactInfo = req.body.contactInfo ? JSON.parse(req.body.contactInfo) : {};
    const coordinates = req.body.coordinates ? JSON.parse(req.body.coordinates) : {};
    const totalStock = req.body.totalStock ? parseFloat(req.body.totalStock) : 0;
    const usedCapacity = req.body.usedCapacity ? parseFloat(req.body.usedCapacity) : 0;
    const totalCapacity = req.body.capacity ? parseFloat(req.body.capacity) : 0;
    
    // Calculate available capacity dynamically
    const availableCapacity = totalCapacity - usedCapacity;

    const newWarehouse = await prisma.warehouse.create({
      data: {
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


/**
 * Get all warehouses.
 */
export const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany();
    res.status(200).json(warehouses);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single warehouse by ID.
 */
export const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { inventories: true, shipments: true },
    });
    if (!warehouse) return next(createError(404, "Warehouse not found!"));
    res.status(200).json(warehouse);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a warehouse.
 */
/**
 * Update a warehouse.
 */
export const updateWarehouse = async (req, res, next) => {
  try {
    // Log the incoming request parameters and body for debugging
    console.log('Request Parameters:', req.params);
    console.log('Request Body:', req.body);

    const updatedWarehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: req.body,
    });

    // Log the updated warehouse for debugging
    console.log('Updated Warehouse:', updatedWarehouse);

    res.status(200).json(updatedWarehouse);
  } catch (err) {
    // Log the error for debugging
    console.error('Error updating warehouse:', err);
    next(err);
  }
};

/**
 * Delete a warehouse.
 */
export const deleteWarehouse = async (req, res, next) => {
  try {
    await prisma.warehouse.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Warehouse has been deleted!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get stock levels in a warehouse.
 */
export const getWarehouseStock = async (req, res, next) => {
  try {
    const stock = await prisma.inventory.findMany({
      where: { warehouseId: req.params.id },
      include: { product: true },
    });
    res.status(200).json(stock);
  } catch (err) {
    next(err);
  }
};

/**
 * Assign product location in warehouse (Aisle, Rack, Bin).
 */
export const assignProductLocation = async (req, res, next) => {
  try {
    const { warehouseId, productId, location } = req.body;

    const updatedInventory = await prisma.inventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { location },
    });

    res.status(200).json(updatedInventory);
  } catch (err) {
    next(err);
  }
};
