import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Cloudinary configured with cloud name:", process.env.CLOUDINARY_CLOUD_NAME);

// Create different storages for different resource types
const createStorage = (folder) => {
  console.log(`Creating Cloudinary storage for folder: ${folder}`);
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
  });
};

// Create upload middlewares for different resource types
export const userUpload = multer({ storage: createStorage('users') });
export const gigUpload = multer({ 
  storage: createStorage('gigs'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
export const communityUpload = multer({ storage: createStorage('communities') });
export const communityPostUpload = multer({ storage: createStorage('communityPosts') });
export const productUpload = multer({ storage: createStorage('products') });
export const storeUpload = multer({ storage: createStorage('stores') });
export const themeCustomizationUpload = multer({ storage: createStorage('themeCustomizations') });

// Utility to upload a file directly (not via middleware)
export const uploadToCloudinary = async (file, folder = 'general') => {
  console.log("Uploading file to Cloudinary:", file.path, "to folder:", folder);
  try {
    const result = await cloudinary.uploader.upload(file.path, { folder });
    console.log("Upload successful. Result:", result);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

// Utility to delete a file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  console.log("Deleting file from Cloudinary with publicId:", publicId);
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Deletion result:", result);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
  }
};

export default cloudinary;
