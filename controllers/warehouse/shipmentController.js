import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from '@prisma/client';
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

// Get all available shipping methods
export const getShippingMethods = async (req, res, next) => {
  try {
    const shippingMethods = await prisma.shippingMethod.findMany();
    res.status(200).json(shippingMethods);
  } catch (error) {
    next(error);
  }
};


export const createShipment = async (req, res, next) => {
    try {
      console.log("📦 Incoming Shipment Request:", req.body);
      console.log("🔍 Extracted Order ID from req.params:", req.params);
      console.log("🔍 Full Request URL:", req.originalUrl); // Logs the actual URL
  
      // ✅ Fix: Use req.body.orderId as a fallback
      const orderId = req.params.orderId || req.body.orderId;
      const { warehouseId, shippingMethodId } = req.body;
  
      if (!orderId) {
        console.error("❌ Order ID missing from request params.");
        return next(createError(400, "Order ID is required."));
      }
  
      if (!warehouseId || !shippingMethodId) {
        console.error("❌ Missing required fields:", { warehouseId, shippingMethodId });
        return next(createError(400, "Warehouse ID and Shipping Method ID are required."));
      }
  
      console.log("🔍 Checking order:", orderId);
  
      // Verify if order exists
      const order = await prisma.productOrder.findUnique({
        where: { id: orderId },
        include: { shipment: true },
      });
  
      if (!order) {
        console.error("❌ Order not found:", orderId);
        return next(createError(404, "Order not found"));
      }
  
      console.log("✅ Order Found:", order);
  
      // Ensure the order is in "ACCEPTED" status before shipping
      if (order.status !== "IN_PROGRESS") {
        console.error("❌ Order not in ACCEPTED state:", order.status);
        return next(createError(400, "Order must be accepted before shipment"));
      }
  
      // Ensure shipment isn't already created
      if (order.shipment) {
        console.error("❌ Shipment already exists for this order.");
        return next(createError(400, "Shipment already exists for this order"));
      }
  
      // Generate unique tracking number
      const trackingNumber = uuidv4().slice(0, 8).toUpperCase();
      console.log("🚚 Generating tracking number:", trackingNumber);
  
      // Create shipment
      const shipment = await prisma.shipment.create({
        data: {
          productOrderId: orderId,
          warehouseId,
          shippingMethodId,
          trackingNumber,
          trackingStatus: "PENDING",
          shippedAt: new Date(),
        },
      });
  
      console.log("✅ Shipment created successfully:", shipment);
  
      // Update order status to "PROCESSING"
      const updatedOrder = await prisma.productOrder.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });
  
      console.log("✅ Order status updated to ACCEPTED:", updatedOrder.status);
  
      res.status(201).json({ message: "Shipment created successfully", shipment });
    } catch (error) {
      console.error("❌ Error in createShipment:", error);
      next(error);
    }
  };
  


// Update shipment status (e.g., Shipped, Delivered, Returned)
export const updateShipmentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { trackingStatus } = req.body;

    console.log("🔄 Updating shipment status for order:", orderId, "➡", trackingStatus);

    // Validate status
    const validStatuses = ["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"];
    if (!validStatuses.includes(trackingStatus)) {
      return next(createError(400, "Invalid tracking status"));
    }

    // Check if shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { productOrderId: orderId },
    });

    if (!shipment) {
      return next(createError(404, "Shipment not found for this order"));
    }

    // Update tracking status
    const updatedShipment = await prisma.shipment.update({
      where: { productOrderId: orderId },
      data: {
        trackingStatus,
        deliveredAt: trackingStatus === "DELIVERED" ? new Date() : null,
      },
    });

    // If order is delivered, mark order as "DELIVERED"
    if (trackingStatus === "DELIVERED") {
      await prisma.productOrder.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      });
    }

    res.status(200).json({ message: "Shipment status updated", updatedShipment });
  } catch (error) {
    next(error);
  }
};

// Get shipment details for an order
export const getShipmentDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    console.log("📦 Fetching shipment details for order:", orderId);

    const shipment = await prisma.shipment.findUnique({
      where: { productOrderId: orderId },
      include: { shippingMethod: true, warehouse: true },
    });

    if (!shipment) {
      return next(createError(404, "Shipment not found for this order"));
    }

    res.status(200).json(shipment);
  } catch (error) {
    next(error);
  }
};
