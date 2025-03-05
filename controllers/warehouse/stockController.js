import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Add new stock when inventory arrives (Stock IN).
 */
export const stockIn = async (req, res, next) => {
  try {
    const { warehouseId, productId, quantity } = req.body;

    // Fetch current warehouse details
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const newUsedCapacity = warehouse.usedCapacity + quantity;

    // Prevent exceeding total capacity
    if (newUsedCapacity > warehouse.capacity) {
      return res.status(400).json({ message: "Not enough space in the warehouse" });
    }

    // Update warehouse usedCapacity
    await prisma.warehouse.update({
      where: { id: warehouseId },
      data: { usedCapacity: newUsedCapacity },
    });

    // Update or insert stock in inventory
    const updatedInventory = await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      update: { quantity: { increment: quantity } },
      create: { warehouseId, productId, quantity },
    });

    // Log the stock movement
    await prisma.stockMovement.create({
      data: {
        warehouseId,
        productId,
        changeType: "INCOMING",
        quantity,
      },
    });

    res.status(200).json({ message: "Stock added successfully!", updatedInventory });
  } catch (err) {
    next(err);
  }
};


/**
 * Deduct stock when an order is processed (Stock OUT).
 */
export const stockOut = async (req, res, next) => {
  try {
    const { warehouseId, productId, quantity } = req.body;

    const inventory = await prisma.inventory.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (!inventory || inventory.quantity < quantity) {
      return next(createError(400, "Insufficient stock available!"));
    }

    const updatedInventory = await prisma.inventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { quantity: { decrement: quantity } },
    });

    // Log the stock movement
    await prisma.stockMovement.create({
      data: {
        warehouseId,
        productId,
        changeType: "OUTGOING",
        quantity,
      },
    });

    res.status(200).json({ message: "Stock deducted successfully!", updatedInventory });
  } catch (err) {
    next(err);
  }
};

/**
 * Get stock movement history for a product.
 */
export const getStockMovements = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(movements);
  } catch (err) {
    next(err);
  }
};

export const getProductInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findMany({
      where: { productId },
      include: { warehouse: true }, // Fetch warehouse details too
    });

    res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};


export const getWarehouseInventory = async (req, res, next) => {
  try {
    const { warehouseId } = req.params;

    const inventory = await prisma.inventory.findMany({
      where: { warehouseId },
      include: { product: true }, // Fetch product details too
    });

    res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};