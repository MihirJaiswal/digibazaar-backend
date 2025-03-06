import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import createError from "../../utils/createError.js"; // Ensure the correct import path

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
 * Create a new product (Only store owner can create).
 */
export const createProduct = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const storeId = req.body.storeId;
    if (!storeId) return next(createError(400, "Store ID is required"));

    // Ensure the user is the owner of the store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true },
    });

    if (!store) return next(createError(404, "Store not found"));
    if (store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to add products to this store"));
    }

    // Ensure tags is always an array, even if it's a string
    let tags = req.body.tags;
    if (tags) {
      if (typeof tags === "string") {
        tags = tags.split(",").map((s) => s.trim());
      } else if (!Array.isArray(tags)) {
        tags = []; // If it's neither a string nor an array, set it to an empty array
      }
    }

    const payload = {
      storeId,
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      sku: req.body.sku,
      mainImage: req.body.mainImage,
      images: req.body.images ? JSON.parse(req.body.images) : null,
      stock: parseInt(req.body.stock, 10),
      weight: req.body.weight ? parseFloat(req.body.weight) : null,
      dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : null,
      tags: tags, // Always an array
      costPerItem: req.body.costPerItem ? parseFloat(req.body.costPerItem) : null,
      profit: req.body.profit ? parseFloat(req.body.profit) : null,
      margin: req.body.margin ? parseFloat(req.body.margin) : null,
      categoryId: req.body.categoryId || null,
    };

    const newProduct = await prisma.product.create({ data: payload });
    res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
};


/**
 * Get all products (Only store owner can view their own products).
 */
export const getProducts = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const products = await prisma.product.findMany({
      where: {
        Store:{
          ownerId: userId, // Only products belonging to stores owned by the user
        },
      },
    });

    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single product by ID (Only if the product belongs to the authenticated user's store).
 */

// In your productController.js

export const getProduct = async (req, res, next) => {
  try {
    console.log("🔹 Received Request Headers:", req.headers);

    // Ensure the Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Missing or malformed Authorization header:", authHeader);
      return next(createError(401, "Authorization token missing"));
    }

    // Extract the token
    const token = authHeader.split(" ")[1];
    if (!token || token === "null") {
      console.error("❌ Invalid extracted token:", token);
      return next(createError(401, "Invalid token"));
    }

    console.log("✅ Extracted Token:", token);

    // Verify JWT token
    let decodedUser;
    try {
      decodedUser = jwt.verify(token, process.env.JWT_KEY);
      console.log("✅ Token successfully verified. Decoded user:", decodedUser);
    } catch (err) {
      console.error("❌ JWT Verification failed:", err.message);
      return next(createError(401, "Invalid or expired token"));
    }

    const userId = decodedUser?.id;
    if (!userId) {
      console.error("❌ User ID missing from token payload:", decodedUser);
      return next(createError(401, "Invalid token"));
    }

    const productId = req.params.id;
    console.log("🔹 Requested Product ID:", productId);

    // Fetch product from database
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    });

    if (!product) {
      console.error("❌ Product not found:", productId);
      return next(createError(404, "Product not found"));
    }

    // Check if the user owns the store
    if (product.Store?.ownerId !== userId) {
      console.error("❌ Unauthorized access attempt by user ID:", userId);
      return next(createError(403, "You are not authorized to view this product"));
    }

    res.status(200).json(product);
  } catch (err) {
    console.error("❌ Error in getProduct:", err);
    next(err);
  }
};



/**
 * Update a product (Only store owner can update their own products).
 */
export const updateProduct = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this product"));
    }

    const { title, description, price, sku, categoryId } = req.body;
    const updatedData = {
      title,
      description,
      price: price ? parseFloat(price) : undefined,
      sku,
      categoryId: categoryId || null,
    };

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: updatedData,
    });

    res.status(200).json(updatedProduct);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a product (Only store owner can delete their own products).
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to delete this product"));
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Product has been deleted!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Add stock to inventory (Only store owner can modify stock).
 */
export const addStock = async (req, res, next) => {
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
      return next(createError(403, "You are not authorized to update this product's stock"));
    }

    const updatedInventory = await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      update: { quantity: { increment: quantity } },
      create: { warehouseId, productId, quantity },
    });

    res.status(200).json(updatedInventory);
  } catch (err) {
    next(err);
  }
};


/**
 * Update stock level (Only store owner can update stock for their products).
 */
export const updateStock = async (req, res, next) => {
  try {
    const userId = verifyToken(req); // Authenticate user
    const { warehouseId, productId, quantity } = req.body;

    // Ensure the user owns the product's store
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this product's stock"));
    }

    const updatedInventory = await prisma.inventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { quantity },
    });

    res.status(200).json(updatedInventory);
  } catch (err) {
    next(err);
  }
};



/**
 * Get stock details for a product (Only show stock for products owned by the authenticated user).
 */
export const getStock = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to view this product's stock"));
    }

    const inventory = await prisma.inventory.findMany({
      where: { productId: req.params.productId },
    });

    res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};


    /* Get products with low stock (Only store owners can view their low-stock products).
    */
export const getLowStockProducts = async (req, res, next) => {
 try {
   const userId = verifyToken(req); // Authenticate user

   const lowStockProducts = await prisma.inventory.findMany({
     where: { quantity: { lte: 5 } }, // Threshold for low stock
     include: { product: { include: { Store: true } } },
   });

   // Filter only products belonging to the authenticated user's store
   const filteredProducts = lowStockProducts.filter(
     (item) => item.product.Store.ownerId === userId
   );

   res.status(200).json(filteredProducts);
 } catch (err) {
   next(err);
 }
};