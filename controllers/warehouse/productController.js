import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Create a new product.
 */
export const createProduct = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;

    // Check for store id either directly or from the nested store object
    const storeId = req.body.storeId || (req.body.store && req.body.store.connect && req.body.store.connect.id);
    if (!storeId) {
      return next(createError(400, "Store ID is required"));
    }

    const payload = {
      store: { connect: { id: storeId } },
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      sku: req.body.sku,
      mainImage: req.body.mainImage,
      images: req.body.images ? JSON.parse(req.body.images) : null,
      stock: parseInt(req.body.stock, 10),
      weight: req.body.weight ? parseFloat(req.body.weight) : null,
      dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : null,
      tags: req.body.tags ? req.body.tags.split(",").map((s) => s.trim()) : null,
      costPerItem: req.body.costPerItem ? parseFloat(req.body.costPerItem) : null,
      profit: req.body.profit ? parseFloat(req.body.profit) : null,
      margin: req.body.margin ? parseFloat(req.body.margin) : null,
      categoryId: req.body.categoryId || null,
    };

    const newProduct = await prisma.product.create({
      data: payload,
    });

    res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
};



/**
 * Get all products.
 */
export const getProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany();
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single product by ID.
 */
export const getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) return next(createError(404, "Product not found!"));
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a product.
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { title, description, price, sku, categoryId } = req.body;

    // Ensure categoryId is null if not provided
    const updatedData = {
      title,
      description,
      price: price ? parseFloat(price) : undefined, // Ensure price is a number
      sku,
      categoryId: categoryId || null, // Convert empty string to null
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
 * Delete a product.
 */
export const deleteProduct = async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Product has been deleted!" });
  } catch (err) {
    next(err);
  }
};



/**
 * Add stock to inventory.
 */
export const addStock = async (req, res, next) => {
  try {
    const { warehouseId, productId, quantity } = req.body;

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
 * Get stock details for a product.
 */
export const getStock = async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { productId: req.params.productId },
    });
    res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};

/**
 * Update stock level.
 */
export const updateStock = async (req, res, next) => {
  try {
    const { warehouseId, productId, quantity } = req.body;

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
 * Get products with low stock.
 */
export const getLowStockProducts = async (req, res, next) => {
  try {
    const lowStockProducts = await prisma.inventory.findMany({
      where: { quantity: { lte: 5 } }, // Threshold for low stock
      include: { product: true },
    });
    res.status(200).json(lowStockProducts);
  } catch (err) {
    next(err);
  }
};
