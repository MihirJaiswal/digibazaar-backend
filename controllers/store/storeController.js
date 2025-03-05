import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Create a new store.
 */
export const createStore = async (req, res, next) => {
  try {
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;

    // Check if user already has a store (since each user can have only one store)
    const existingStore = await prisma.store.findUnique({
      where: { ownerId: userId },
    });

    if (existingStore) {
      return next(createError(400, "User already owns a store!"));
    }

    // Create store
    const newStore = await prisma.store.create({
      data: {
        ownerId: userId,
        name: req.body.name,
        description: req.body.description || "",
        theme: req.body.theme || "default",
        logo: req.body.logo || "",
        domain: req.body.domain || null, // Optional custom domain
        subdomain: req.body.subdomain || `${req.body.name.toLowerCase().replace(/\s+/g, "-")}.mystore.com`,
      },
    });

    res.status(201).json(newStore);
  } catch (err) {
    next(err);
  }
};
