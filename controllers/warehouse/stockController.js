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
 * Add new stock when inventory arrives (Stock IN) (Only store owners).
 */
export const stockIn = async (req, res, next) => {
  try {
    console.log("stockIn: Received request with body:", req.body);
    
    // Authenticate user
    const user = verifyToken(req);
    console.log("stockIn: User from token:", user);
    const userId = user; // Assuming verifyToken returns the user ID
    console.log("stockIn: userId:", userId);

    const { warehouseId, productId, quantity } = req.body;
    console.log("stockIn: warehouseId, productId, quantity:", warehouseId, productId, quantity);

    // Ensure the user owns the product's store
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    });
    console.log("stockIn: Fetched product:", product);

    if (!product) {
      console.log("stockIn: Product not found");
      return next(createError(404, "Product not found"));
    }
    if (product.Store.ownerId !== userId) {
      console.log(
        "stockIn: Unauthorized - Product's store ownerId:",
        product.Store.ownerId,
        "does not match userId:",
        userId
      );
      return next(createError(403, "You are not authorized to add stock to this product"));
    }

    // Fetch current warehouse details
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    console.log("stockIn: Fetched warehouse:", warehouse);

    if (!warehouse) {
      console.log("stockIn: Warehouse not found");
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const newUsedCapacity = warehouse.usedCapacity + quantity;
    console.log("stockIn: Calculated newUsedCapacity:", newUsedCapacity, "Warehouse capacity:", warehouse.capacity);

    // Prevent exceeding total capacity
    if (newUsedCapacity > warehouse.capacity) {
      console.log("stockIn: Not enough space in warehouse - newUsedCapacity exceeds capacity");
      return res.status(400).json({ message: "Not enough space in the warehouse" });
    }

    // Update warehouse usedCapacity
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id: warehouseId },
      data: { usedCapacity: newUsedCapacity },
    });
    console.log("stockIn: Updated warehouse usedCapacity:", updatedWarehouse);

    // Update or insert stock in inventory
    const updatedInventory = await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      update: { quantity: { increment: quantity } },
      create: { 
        quantity,
        warehouse: { connect: { id: warehouseId } },
        product: { connect: { id: productId } },
        Store: { connect: { id: product.Store.id } }, // Connect the store using the product's store id
      },
    });
    
    
    
    console.log("stockIn: Updated/Created inventory record:", updatedInventory);

    // Log the stock movement
    const stockMovement = await prisma.stockMovement.create({
      data: {
    changeType: "INCOMING",
    quantity: 1,
    warehouse: { connect: { id: warehouseId } },
    product: { connect: { id: productId } },
    Store: { connect: { id: product.Store.id } }, // using the store from the fetched product
  },
    });
    console.log("stockIn: Logged stock movement:", stockMovement);

    console.log("stockIn: Stock added successfully!");
    res.status(200).json({ message: "Stock added successfully!", updatedInventory });
  } catch (err) {
    console.error("stockIn: Error occurred:", err);
    next(err);
  }
};



/**
 * Deduct stock when an order is processed (Stock OUT) (Only store owners).
 */
export const stockOut = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { warehouseId, productId, quantity } = req.body;

    // Ensure the user owns the product's store
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to deduct stock from this product"));
    }

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

    // Log the stock movement using nested connect for required relations
    await prisma.stockMovement.create({
      data: {
        changeType: "OUTGOING",
        quantity,
        warehouse: { connect: { id: warehouseId } },
        product: { connect: { id: productId } },
        Store: { connect: { id: product.Store.id } },
      },
    });

    res.status(200).json({ message: "Stock deducted successfully!", updatedInventory });
  } catch (err) {
    next(err);
  }
};



/**
 * Get stock movement history for a product (Only store owners).
 */
export const getStockMovements = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { productId } = req.params;

    // Ensure the user owns the product's store
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to view stock movements for this product"));
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(movements);
  } catch (err) {
    next(err);
  }
};


/**
 * Get product inventory details (Only store owners).
 */
export const getProductInventory = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { productId } = req.params;

    // Ensure the user owns the product's store
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to view inventory for this product"));
    }

    const inventory = await prisma.inventory.findMany({
      where: { productId },
      include: { warehouse: true },
    });

    res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};

/**
 * Get warehouse inventory details (Only warehouse owners).
 */

export const getWarehouseInventory = async (req, res, next) => {
  try {
    console.log("🔹 Received Request");
    console.log("➡️ Method:", req.method);
    console.log("➡️ Path:", req.originalUrl);
    console.log("➡️ Headers:", req.headers);
    console.log("➡️ Body:", req.body);
    console.log("➡️ Params:", req.params);

    // Ensure Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Missing or malformed Authorization header:", authHeader);
      return next(createError(401, "Access denied. No token provided."));
    }

    // Extract the token
    const token = authHeader.split(" ")[1];
    if (!token || token === "null") {
      console.error("❌ Invalid extracted token:", token);
      return next(createError(401, "Invalid token."));
    }

    console.log("✅ Extracted Token:", token);

    // Verify JWT token
    let decodedUser;
    try {
      decodedUser = jwt.verify(token, process.env.JWT_KEY);
      console.log("✅ Token Verified. Decoded User:", decodedUser);
    } catch (err) {
      console.error("❌ JWT Verification Failed:", err.message);
      return next(createError(401, "Invalid or expired token."));
    }

    const userId = decodedUser?.id;
    if (!userId) {
      console.error("❌ User ID missing in token payload:", decodedUser);
      return next(createError(401, "Invalid token."));
    }

    console.log("✅ User ID from Token:", userId);

    const { warehouseId } = req.params;
    console.log("🔹 Checking Warehouse Access for Warehouse ID:", warehouseId);

    // Ensure the user owns the warehouse (based on products stored inside)
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        Store: {
          ownerId: userId, // ✅ Check if the warehouse belongs to the user's store
        },
      },
    });
    

    console.log("✅ Warehouse Found:", warehouse ? "Yes" : "No");

    if (!warehouse) {
      console.error("❌ Unauthorized access attempt by user ID:", userId);
      return next(createError(403, "You are not authorized to view inventory for this warehouse."));
    }

    console.log("🔹 Fetching Inventory for Warehouse ID:", warehouseId);

    const inventory = await prisma.inventory.findMany({
      where: { warehouseId },
      include: { product: true },
    });

    console.log("✅ Inventory Fetched. Items Found:", inventory.length);

    res.status(200).json(inventory);
  } catch (err) {
    console.error("❌ Error in getWarehouseInventory:", err);
    next(err);
  }
};

