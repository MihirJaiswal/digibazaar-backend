import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Get a detailed stock report including total value of stock.
 */
export const getStockReport = async (req, res, next) => {
  try {
    const stockReport = await prisma.inventory.findMany({
      include: { product: true, warehouse: true },
    });

    const report = stockReport.map(item => ({
      warehouse: item.warehouse.name,
      product: item.product.title,
      stock: item.quantity,
      stockValue: item.quantity * item.product.price,
    }));

    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * Get sales report including total revenue, top-selling products, and sales trends.
 */
export const getSalesReport = async (req, res, next) => {
  try {
    const totalSales = await prisma.productOrder.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: { status: "COMPLETED" },
    });

    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
      include: { product: true },
    });

    const monthlySales = await prisma.productOrder.groupBy({
      by: ["createdAt"],
      _sum: { totalPrice: true },
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      totalRevenue: totalSales._sum.totalPrice || 0,
      totalOrders: totalSales._count.id,
      topSellingProducts: topProducts.map(p => ({
        product: p.product.title,
        quantitySold: p._sum.quantity,
      })),
      revenueTrend: monthlySales.map(sale => ({
        month: sale.createdAt.toISOString().substring(0, 7),
        revenue: sale._sum.totalPrice,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get low-stock alerts with supplier details.
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const lowStockProducts = await prisma.inventory.findMany({
      where: { quantity: { lte: 5 } },
      include: { product: { include: { PurchaseOrder: { include: { supplier: true } } } }, warehouse: true },
    });

    const report = lowStockProducts.map(item => ({
      warehouse: item.warehouse.name,
      product: item.product.title,
      currentStock: item.quantity,
      reorderLevel: item.reorderLevel,
      supplier: item.product.PurchaseOrder?.supplier?.name || "No supplier assigned",
      supplierContact: item.product.PurchaseOrder?.supplier?.contactInfo || "N/A",
    }));

    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * Get order summary including order trends and average order value.
 */
export const getOrderSummary = async (req, res, next) => {
  try {
    const orderSummary = await prisma.productOrder.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const averageOrderValue = await prisma.productOrder.aggregate({
      _avg: { totalPrice: true },
      where: { status: "COMPLETED" },
    });

    const dailyOrders = await prisma.productOrder.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      orderStatusCount: orderSummary,
      averageOrderValue: averageOrderValue._avg.totalPrice || 0,
      orderTrend: dailyOrders.map(order => ({
        date: order.createdAt.toISOString().split("T")[0],
        orders: order._count.id,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get warehouse utilization report (capacity used vs. available).
 */
export const getWarehouseUtilization = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { inventories: true },
    });

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

    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
};
