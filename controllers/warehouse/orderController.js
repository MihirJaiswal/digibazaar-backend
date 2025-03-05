import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Create a new order.
 */
export const createOrder = async (req, res, next) => {
  try {
    const newOrder = await prisma.productOrder.create({
      data: {
        storeId: req.body.storeId,
        userId: req.body.userId,
        totalPrice: req.body.totalPrice,
        status: "PENDING",
        shippingAddress: req.body.shippingAddress,
        paymentStatus: "PENDING",
        items: { create: req.body.items }, // Expecting an array of items
      },
    });
    res.status(201).json(newOrder);
  } catch (err) {
    next(err);
  }
};

/**
 * Update order status (Pending, In Progress, Completed, etc.).
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const updatedOrder = await prisma.productOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.status(200).json(updatedOrder);
  } catch (err) {
    next(err);
  }
};

export const assignStockToOrder = async (req, res, next) => {
  try {
    const { orderId, items } = req.body;

    console.log("🚀 Received stock assignment request:");
    console.log("➡️ Order ID:", orderId);
    console.log("📦 Items to assign:", JSON.stringify(items, null, 2));

    // ✅ Validate request body
    if (!orderId || !Array.isArray(items) || items.length === 0) {
      console.log("❌ Invalid request: Missing orderId or items.");
      return next(createError(400, "Invalid request: Order ID and items are required."));
    }

    // ✅ Fetch order details
    console.log("📋 Fetching order details...");
    const order = await prisma.productOrder.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    console.log("✅ Order Details:", order);

    if (!order) {
      console.log("❌ Order not found:", orderId);
      return next(createError(404, "Order not found."));
    }

    console.log("📋 Order Status:", order.status);

    // ✅ Ensure order is in ACCEPTED state before assigning stock
    if (order.status !== "ACCEPTED") {
      console.log(`⛔ Order ${orderId} is in ${order.status} state, not ACCEPTED. Stock assignment not allowed.`);
      return next(createError(400, `Order must be ACCEPTED before assigning stock. Current status: ${order.status}`));
    }

    console.log("✅ Order is ACCEPTED. Proceeding with stock assignment...");

    // ✅ Start a transaction for atomic updates
    await prisma.$transaction(async (prisma) => {
      for (const item of items) {
        console.log(`🔍 Checking inventory for Product ID: ${item.productId} in Warehouse ID: ${item.warehouseId}`);

        // Validate warehouseId
        if (!item.warehouseId) {
          console.log(`❌ Missing warehouseId in item: ${JSON.stringify(item)}`);
          throw createError(400, "Warehouse ID is missing in request items.");
        }

        // ✅ Fetch inventory
        const inventory = await prisma.inventory.findUnique({
          where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
          select: { quantity: true },
        });

        console.log(`🔍 Inventory for Product ${item.productId}:`, inventory);

        if (!inventory) {
          console.log(`❌ No inventory found for Product ${item.productId} in Warehouse ${item.warehouseId}`);
          throw createError(404, `Inventory not found for product ${item.productId} in warehouse ${item.warehouseId}`);
        }

        console.log(`📦 Current stock for Product ${item.productId}:`, inventory.quantity);

        // ✅ Check if stock is sufficient
        if (inventory.quantity < item.quantity) {
          console.log(`⛔ Insufficient stock! Requested: ${item.quantity}, Available: ${inventory.quantity}`);
          throw createError(400, `Insufficient stock for product ${item.productId}`);
        }

        // ✅ Deduct stock
        console.log(`✅ Deducting ${item.quantity} from stock of Product ${item.productId} in Warehouse ${item.warehouseId}`);

        await prisma.inventory.update({
          where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
          data: { quantity: { decrement: item.quantity } },
        });

        console.log(`📉 Updated stock for Product ${item.productId} in Warehouse ${item.warehouseId}`);
      }
    });

    // ✅ Update order status to IN_PROGRESS after assigning stock
    console.log(`🔄 Updating Order ${orderId} status to IN_PROGRESS`);
    await prisma.productOrder.update({
      where: { id: orderId },
      data: { status: "IN_PROGRESS" },
    });

    console.log(`✅ Order ${orderId} is now IN_PROGRESS`);

    res.status(200).json({ message: "Stock assigned to order successfully and order moved to IN_PROGRESS!" });
  } catch (err) {
    console.error("🔥 Error in assignStockToOrder:", err);

    // ✅ Log Prisma-specific errors
    if (err instanceof Error) {
      console.error("🔍 Prisma Error Message:", err.message);
    }

    next(err);
  }
};
/**
 * Get all orders of a specific store
 */
export const getOrders = async (req, res, next) => {
  try {
    const orders = await prisma.productOrder.findMany({
      where: { storeId: req.params.storeId },
      include: { items: true },
    });
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};


/**
 * Get a single order by ID.
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await prisma.productOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return next(createError(404, "Order not found!"));
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};
