import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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



// In a paymentController.js file
export const createPaymentIntentForProductOrder = async (req, res, next) => {
  try {
    const { productId, storeId } = req.body;
    console.log("Creating Payment Intent for productId:", productId, "storeId:", storeId);
    if (!productId || !storeId) {
      return next(createError(400, "Missing productId or storeId"));
    }

    // Fetch product to get the price.
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return next(createError(404, "Product not found"));
    }

    // Calculate amount (in cents for USD; adjust if needed)
    const amount = Math.round(product.price * 100);
    console.log("Calculated amount (cents):", amount);

    // Create a Payment Intent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr", // Adjust currency as needed
      payment_method_types: ["card"],
      description: `Payment for product: ${product.title}`,
    });

    console.log("Stripe Payment Intent created:", paymentIntent);
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating Payment Intent:", error);
    next(error);
  }
};



/**
 * Create a new order (Only the logged-in user can create an order for themselves).
 */
export const createOrder = async (req, res, next) => {
  try {
    console.log("🔹 Received Request:");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Headers:", req.headers);
    console.log("Cookies:", req.cookies);
    console.log("Body:", req.body);

    // Extract token from headers or cookies.
    let token = req.headers.authorization;
    if (!token) {
      token = req.cookies?.accessToken;
    }
    if (!token) {
      console.log("❌ Authentication token is missing");
      return next(createError(401, "Authentication token is missing"));
    }
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }
    console.log("✅ Cleaned token:", token);

    // Decode the token and extract buyer's user id.
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("Decoded token:", decoded);
    const buyerId = decoded.id;
    console.log("Extracted buyerId:", buyerId);

    // Extract required fields from the request body.
    const { storeId, shippingAddress, totalPrice, items } = req.body;
    let { paymentIntentId } = req.body; // may be undefined
    console.log("Extracted order details:", { storeId, paymentIntentId, shippingAddress, totalPrice, items });
    if (!storeId || !shippingAddress || !totalPrice || !items) {
      console.log("❌ Missing required fields in order payload (excluding paymentIntentId)");
      return next(createError(400, "Missing required fields"));
    }

    // Fetch the store using the provided storeId.
    console.log("Fetching store with storeId:", storeId);
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    console.log("Fetched store:", store);
    if (!store) {
      console.log("❌ Store not found for storeId:", storeId);
      return next(createError(404, "Store not found"));
    }

    // Prevent store owners from creating orders for their own store.
    if (store.ownerId === buyerId) {
      console.log("❌ Buyer is the store owner. Order creation not allowed.");
      return next(createError(403, "Store owners cannot create orders for their own store."));
    }

    // If paymentIntentId is not provided, create a PaymentIntent internally.
    if (!paymentIntentId) {
      console.log("No paymentIntentId provided. Creating PaymentIntent internally...");
      // Here, we assume totalPrice is in dollars; convert to cents.
      const amount = Math.round(totalPrice * 100);
      console.log("Calculated amount (cents):", amount);

      // Create a PaymentIntent with Stripe.
      const newPaymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "inr", // Adjust as needed (or "inr" if required)
        payment_method_types: ["card"],
        description: `Payment for order at store ${store.name}`,
      });
      paymentIntentId = newPaymentIntent.id;
      console.log("Created PaymentIntent internally:", newPaymentIntent);
    } else {
      // If provided, verify that the PaymentIntent succeeded.
      console.log("Retrieving provided PaymentIntent with ID:", paymentIntentId);
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log("Retrieved PaymentIntent:", paymentIntent);
      if (paymentIntent.status !== "succeeded") {
        console.log("❌ Provided PaymentIntent not completed. Status:", paymentIntent.status);
        return next(createError(400, "Payment not completed"));
      }
    }

    // Create a new order in the database using the verified buyerId.
    console.log("Creating new order in the database...");
    const newOrder = await prisma.productOrder.create({
      data: {
        storeId,
        userId: buyerId,
        totalPrice,
        status: "PENDING",
        shippingAddress,
        paymentStatus: "PENDING", // update later if needed
        paymentIntent: paymentIntentId,
        items: { create: items },
      },
    });
    console.log("✅ New order created:", newOrder);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("❌ Error in createOrder:", err);
    next(err);
  }
};

/**
 * Update order status (Only the store owner or buyer can update it).
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const order = await prisma.productOrder.findUnique({
      where: { id: req.params.id },
      include: { store: true }, // Include store details to check owner
    });

    if (!order) return next(createError(404, "Order not found!"));

    // Only the store owner or the buyer can update the order
    if (order.userId !== userId && order.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this order.")); // Ensure only store owner or buyer can update
    }

    const updatedOrder = await prisma.productOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    res.status(200).json(updatedOrder);
  } catch (err) {
    next(err);
  }
};

/**
 * Assign stock to an order (Only store owners can assign stock).
 */
export const assignStockToOrder = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { orderId, items } = req.body;

    const order = await prisma.productOrder.findUnique({
      where: { id: orderId },
      include: { store: true }, // Get store details
    });

    if (!order) return next(createError(404, "Order not found!"));

    // Only the store owner can assign stock
    if (order.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to assign stock to this order.")); // Ensure only store owner assigns stock
    }

    // ✅ Proceed with stock assignment logic...
    await prisma.$transaction(async (prisma) => {
      for (const item of items) {
        const inventory = await prisma.inventory.findUnique({
          where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
          select: { quantity: true },
        });

        if (!inventory || inventory.quantity < item.quantity) {
          throw createError(400, `Insufficient stock for product ${item.productId}`); // Handle insufficient stock
        }

        await prisma.inventory.update({
          where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    });

    await prisma.productOrder.update({
      where: { id: orderId },
      data: { status: "IN_PROGRESS" },
    });

    res.status(200).json({ message: "Stock assigned successfully, order moved to IN_PROGRESS!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders of a specific store (Only the store owner can view them).
 */
export const getOrders = async (req, res, next) => {
  try {
    console.log("getOrders: Received request", { headers: req.headers, body: req.body });

    // Extract and verify token directly using jwt.verify.
    const authHeader = req.headers.authorization;
    console.log("getOrders: authHeader:", authHeader);
    if (!authHeader) {
      console.log("getOrders: No authentication token found.");
      return next(createError(401, "No authentication token found."));
    }
    const token = authHeader.split(" ")[1];
    console.log("getOrders: Extracted token:", token);
    if (!token || token === "null") {
      console.log("getOrders: Invalid token.");
      return next(createError(401, "Invalid token."));
    }
    
    // Verify the token.
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getOrders: Decoded token:", decoded);
    const userId = decoded.id;
    console.log("getOrders: Decoded User ID:", userId);

    // Fetch the store using the user's ID (assuming ownerId matches the user id).
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      select: { id: true, ownerId: true },
    });
    console.log("getOrders: Fetched store:", store);

    if (!store) {
      console.log("getOrders: Store not found for this user.");
      return next(createError(404, "Store not found for this user."));
    }

    // Ensure the store's owner matches the authenticated user.
    if (store.ownerId !== userId) {
      console.log("getOrders: Unauthorized - store owner does not match userId.");
      return next(createError(403, "You are not authorized to view these orders."));
    }

    // Fetch orders using the store's ID.
    const orders = await prisma.productOrder.findMany({
      where: { storeId: store.id },
      include: { items: true },
    });
    console.log("getOrders: Fetched orders:", orders);

    res.status(200).json(orders);
  } catch (err) {
    console.error("getOrders: Error occurred:", err);
    next(err);
  }
};





/**
 * Get a single order by ID (Only the buyer or store owner can view).
 */
export const getOrder = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const order = await prisma.productOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true, store: true },
    });

    if (!order) return next(createError(404, "Order not found!"));

    // Only the buyer or store owner can view the order
    if (order.userId !== userId && order.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to view this order.")); // Ensure only buyer or store owner can view
    }

    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};
