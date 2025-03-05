import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Add new stock when inventory arrives (Stock IN).
 */
export const stockIn = async (req, res, next) => {
  try {
    const { warehouseId, productId, quantity } = req.body;

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
