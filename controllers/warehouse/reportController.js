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
 * Get a detailed stock report including total value of stock (Only store owners).
 */
export const getStockReport = async (req, res, next) => {
  try {
    console.log("getStockReport: Received request, headers:", req.headers);

    // Verify token and get decoded payload.
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || token === "null") {
      return next(createError(401, "No authentication token found."));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getStockReport: Decoded token:", decoded);

    // Determine the userId (if decoded is an object, use decoded.id)
    const userId = typeof decoded === "object" && decoded.id ? decoded.id : decoded;
    console.log("getStockReport: Using userId:", userId);
    
    if (!userId) {
      return next(createError(401, "Invalid token: missing user id."));
    }

    // Fetch stores owned by the user.
    const stores = await prisma.store.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    console.log("getStockReport: Fetched stores:", stores);

    // If no stores are found, send a response with a message.
    if (!stores.length) {
      console.log("getStockReport: No stores found for this user.");
      return res.status(200).json({ message: "No stores found for this user." });
    }

    const storeIds = stores.map((store) => store.id);
    console.log("getStockReport: Extracted store IDs:", storeIds);

    // Fetch inventory for products that belong to the user's stores.
    const stockReport = await prisma.inventory.findMany({
      where: { product: { storeId: { in: storeIds } } },
      include: { product: true, warehouse: true },
    });
    console.log("getStockReport: Fetched stock report:", stockReport);

    const report = stockReport.map(item => ({
      warehouse: item.warehouse.name,
      product: item.product.title,
      stock: item.quantity,
      stockValue: item.quantity * item.product.price,
    }));
    console.log("getStockReport: Final report:", report);

    res.status(200).json(report);
  } catch (err) {
    console.error("getStockReport: Error occurred:", err);
    next(err);
  }
};



/**
 * Get sales report (Only store owners).
 */
export const getSalesReport = async (req, res, next) => {
  try {
    console.log("getSalesReport: Received request, headers:", req.headers);

    // Extract and verify token.
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || token === "null") {
      console.error("getSalesReport: No authentication token found.");
      return next(createError(401, "No authentication token found."));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getSalesReport: Decoded token:", decoded);
    const userId = typeof decoded === "object" && decoded.id ? decoded.id : decoded;
    console.log("getSalesReport: Using userId:", userId);
    if (!userId) {
      return next(createError(401, "Invalid token: missing user id."));
    }

    // Fetch stores owned by the user.
    const stores = await prisma.store.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    console.log("getSalesReport: Fetched stores:", stores);
    if (!stores.length) {
      console.error("getSalesReport: No stores found for this user.");
      return next(createError(403, "You are not authorized to view sales reports."));
    }

    const storeIds = stores.map((store) => store.id);
    console.log("getSalesReport: Extracted store IDs:", storeIds);

    // Aggregate total sales and order count.
    const totalSales = await prisma.productOrder.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: { status: "COMPLETED", storeId: { in: storeIds } },
    });
    console.log("getSalesReport: Aggregated total sales:", totalSales);

    // Get top selling products.
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });
    console.log("getSalesReport: Grouped top products:", topProducts);

    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { title: true },
        });
        return {
          product,
          quantitySold: item._sum.quantity,
        };
      })
    );
    console.log("getSalesReport: Products with details:", productsWithDetails);

    res.status(200).json({
      totalRevenue: totalSales._sum.totalPrice || 0,
      totalOrders: totalSales._count.id,
      topSellingProducts: productsWithDetails,
    });
  } catch (err) {
    console.error("getSalesReport: Error occurred:", err);
    next(err);
  }
};


/**
 * Get low-stock alerts with supplier details (Only store owners).
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    console.log("getLowStockAlerts: Received request, headers:", req.headers);

    // Extract and verify token.
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || token === "null") {
      console.error("getLowStockAlerts: No authentication token found.");
      return next(createError(401, "No authentication token found."));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getLowStockAlerts: Decoded token:", decoded);
    const userId = typeof decoded === "object" && decoded.id ? decoded.id : decoded;
    console.log("getLowStockAlerts: Using userId:", userId);
    if (!userId) {
      return next(createError(401, "Invalid token: missing user id."));
    }

    // Fetch stores owned by the user.
    const stores = await prisma.store.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    console.log("getLowStockAlerts: Fetched stores:", stores);
    if (!stores.length) {
      console.error("getLowStockAlerts: No stores found for this user.");
      return next(createError(403, "You are not authorized to view low stock alerts."));
    }
    const storeIds = stores.map(store => store.id);
    console.log("getLowStockAlerts: Extracted store IDs:", storeIds);

    // Fetch inventory for low-stock products.
    const lowStockProducts = await prisma.inventory.findMany({
      where: { quantity: { lte: 5 }, product: { storeId: { in: storeIds } } },
      include: {
        product: { include: { PurchaseOrder: { include: { supplier: true } } } },
        warehouse: true
      },
    });
    console.log("getLowStockAlerts: Fetched low stock products:", lowStockProducts);

    const report = lowStockProducts.map(item => ({
      warehouse: item.warehouse.name,
      product: item.product.title,
      currentStock: item.quantity,
      reorderLevel: item.reorderLevel,
      supplier: item.product.PurchaseOrder?.supplier?.name || "No supplier assigned",
      supplierContact: item.product.PurchaseOrder?.supplier?.contactInfo || "N/A",
    }));
    console.log("getLowStockAlerts: Final report:", report);

    res.status(200).json(report);
  } catch (err) {
    console.error("getLowStockAlerts: Error occurred:", err);
    next(err);
  }
};


/**
 * Get order summary (Only store owners).
 */
export const getOrderSummary = async (req, res, next) => {
  try {
    console.log("getOrderSummary: Received request, headers:", req.headers);

    // Extract and verify token.
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || token === "null") {
      console.error("getOrderSummary: No authentication token found.");
      return next(createError(401, "No authentication token found."));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getOrderSummary: Decoded token:", decoded);
    const userId = typeof decoded === "object" && decoded.id ? decoded.id : decoded;
    console.log("getOrderSummary: Using userId:", userId);
    if (!userId) {
      return next(createError(401, "Invalid token: missing user id."));
    }

    // Fetch stores owned by the user.
    const stores = await prisma.store.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    console.log("getOrderSummary: Fetched stores:", stores);
    if (!stores.length) {
      console.error("getOrderSummary: No stores found for this user.");
      return next(createError(403, "You are not authorized to view order summaries."));
    }
    const storeIds = stores.map(store => store.id);
    console.log("getOrderSummary: Extracted store IDs:", storeIds);

    const orderSummary = await prisma.productOrder.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { storeId: { in: storeIds } },
    });
    console.log("getOrderSummary: Grouped order summary:", orderSummary);

    const averageOrderValue = await prisma.productOrder.aggregate({
      _avg: { totalPrice: true },
      where: { status: "COMPLETED", storeId: { in: storeIds } },
    });
    console.log("getOrderSummary: Calculated average order value:", averageOrderValue);

    res.status(200).json({
      orderStatusCount: orderSummary,
      averageOrderValue: averageOrderValue._avg.totalPrice || 0,
    });
  } catch (err) {
    console.error("getOrderSummary: Error occurred:", err);
    next(err);
  }
};


/**
 * Get warehouse utilization report (Only warehouse owners).
 */
export const getWarehouseUtilization = async (req, res, next) => {
  try {
    console.log("getWarehouseUtilization: Received request, headers:", req.headers);

    // Extract and verify token.
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || token === "null") {
      console.error("getWarehouseUtilization: No authentication token found.");
      return next(createError(401, "No authentication token found."));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getWarehouseUtilization: Decoded token:", decoded);
    const userId = typeof decoded === "object" && decoded.id ? decoded.id : decoded;
    console.log("getWarehouseUtilization: Using userId:", userId);
    if (!userId) {
      return next(createError(401, "Invalid token: missing user id."));
    }

    // Fetch warehouses where inventories include products from a store owned by the user.
    const warehouses = await prisma.warehouse.findMany({
      where: { inventories: { some: { product: { store: { ownerId: userId } } } } },
      include: { inventories: true },
    });
    console.log("getWarehouseUtilization: Fetched warehouses:", warehouses);
    if (!warehouses.length) {
      console.error("getWarehouseUtilization: No warehouses found for user:", userId);
      return next(createError(403, "You are not authorized to view warehouse utilization."));
    }

    const report = warehouses.map(warehouse => {
      const totalStock = warehouse.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      return {
        warehouse: warehouse.name,
        location: warehouse.location,
        totalCapacity: warehouse.capacity,
        usedCapacity: totalStock,
        utilizationPercentage: ((totalStock / warehouse.capacity) * 100).toFixed(2) + "%",
      };
    });
    console.log("getWarehouseUtilization: Final report:", report);

    res.status(200).json(report);
  } catch (err) {
    console.error("getWarehouseUtilization: Error occurred:", err);
    next(err);
  }
};
