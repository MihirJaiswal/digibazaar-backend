import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();


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
 * Get the theme customization for a given store.
 * GET /api/theme-customizations/:storeId
 */
export const getThemeCustomization = async (req, res) => {
    const user = verifyToken(req); // Authenticate user
    // Depending on what verifyToken returns, you might need to use user.id
    const userId = user.id || user; 
  
    try {
      // Fetch the store associated with this user
      const store = await prisma.store.findUnique({
        where: { ownerId: userId },
      });
      if (!store) {
        return res.status(404).json({ message: 'Store not found for this user' });
      }
  
      // Now use the store's id to fetch theme customization
      const customization = await prisma.themeCustomization.findUnique({
        where: { storeId: store.id },
      });
  
      if (!customization) {
        return res.status(201).json({ message: 'Theme customization not found for this store' });
      }
  
      res.status(200).json(customization);
    } catch (error) {
      console.error('Error fetching theme customization:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };


  //getThemeCustomizationByStoreName
  export const getThemeCustomizationByStoreName = async (req, res) => {
    const { name } = req.params;

    try {
        // Find the store by name
        const store = await prisma.store.findUnique({
            where: { name },
        });

        if (!store) {
            return res.status(404).json({ message: "Store not found" });
        }

        // Fetch theme customization for the store
        const customization = await prisma.themeCustomization.findUnique({
            where: { storeId: store.id },
        });

        if (!customization) {
            return res.status(201).json({ message: "Theme customization not found for this store" });
        }

        res.status(200).json(customization);
    } catch (error) {
        console.error("Error fetching theme customization:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


  

/**
 * Create a new theme customization for a store.
 * POST /api/theme-customizations
 */
export const createThemeCustomization = async (req, res) => {
  const {
    storeId,
    theme,
    fontFamily,
    fontSize,
    fontColor,
    backgroundColor,
    textColor,
    buttonColor,
    bannerImage,
    bannerText,
    footerText,
  } = req.body;

  try {
    const newCustomization = await prisma.themeCustomization.create({
      data: {
        storeId,
        theme,
        fontFamily,
        fontSize,
        fontColor,
        backgroundColor,
        textColor,
        buttonColor,
        bannerImage,
        bannerText,
        footerText,
      },
    });

    res.status(201).json(newCustomization);
  } catch (error) {
    console.error('Error creating theme customization:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update the theme customization for a given store.
 * PUT /api/theme-customizations/:storeId
 */
export const updateThemeCustomization = async (req, res) => {
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
  
    // Verify token and extract user information.
    const user = verifyToken(req); 
    const userId = user.id || user; // Adjust according to your verifyToken return
  
    console.log("User ID from token:", userId);
  
    try {
      // Fetch the store associated with this user
      const store = await prisma.store.findUnique({
        where: { ownerId: userId },
      });
  
      if (!store) {
        console.error("Store not found for user:", userId);
        return res.status(404).json({ message: "Store not found for this user" });
      }
  
      console.log("Store found:", store);
  
      // Use the store's id for the update
      const updateData = req.body;
      console.log("Update data:", updateData);
  
      const updatedCustomization = await prisma.themeCustomization.update({
        where: { storeId: store.id },
        data: updateData,
      });
  
      console.log("Updated customization:", updatedCustomization);
      res.status(200).json(updatedCustomization);
    } catch (error) {
      console.error("Error updating theme customization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  
  

/**
 * Delete the theme customization for a given store.
 * DELETE /api/theme-customizations/:storeId
 */
export const deleteThemeCustomization = async (req, res) => {
    console.log("Request headers:", req.headers);
    console.log("Request params:", req.params);
  
    // Verify token and extract user information.
    const user = verifyToken(req);
    const userId = user.id || user; // Adjust based on your verifyToken return
  
    console.log("User ID from token:", userId);
  
    try {
      // Fetch the store associated with this user
      const store = await prisma.store.findUnique({
        where: { ownerId: userId },
      });
  
      if (!store) {
        console.error("Store not found for user:", userId);
        return res.status(404).json({ message: "Store not found for this user" });
      }
  
      console.log("Store found:", store);
  
      // Delete the theme customization using the store's id
      await prisma.themeCustomization.delete({
        where: { storeId: store.id },
      });
  
      console.log("Theme customization deleted successfully");
      res.status(200).json({ message: "Theme customization deleted successfully" });
    } catch (error) {
      console.error("Error deleting theme customization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  