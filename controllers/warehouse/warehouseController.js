import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Create a new warehouse.
 */
export const createWarehouse = async (req, res, next) => {
  try {
    const newWarehouse = await prisma.warehouse.create({
      data: {
        name: req.body.name,
        location: req.body.location,
        capacity: req.body.capacity,
        contactInfo: req.body.contactInfo,
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
export const updateWarehouse = async (req, res, next) => {
  try {
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
