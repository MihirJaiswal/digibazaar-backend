import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// This endpoint is public; no token authentication is required.
export const getProductsByStoreName = async (req, res) => {
  try {
    const { storeName } = req.params;
    if (!storeName) {
      return res.status(400).json({ message: "storeName parameter is required" });
    }

    // Find the store by its name.
    const store = await prisma.store.findUnique({
      where: { name: storeName },
    });

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Retrieve products associated with this store's id.
    const products = await prisma.product.findMany({
      where: { storeId: store.id },
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products by storeName:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
