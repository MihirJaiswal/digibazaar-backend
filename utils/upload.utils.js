import cloudinary from 'cloudinary';

// Function to upload multiple files
export const uploadMultipleFiles = async (files, folder = 'general') => {
  console.log("Uploading multiple files to Cloudinary. Files:", files, "Folder:", folder);
  try {
    const uploadPromises = files.map(file => {
      console.log("Uploading file:", file.path);
      return cloudinary.v2.uploader.upload(file.path, { folder });
    });
    
    const results = await Promise.all(uploadPromises);
    console.log("Multiple files upload results:", results);
    return results.map(result => result.secure_url);
  } catch (error) {
    console.error("Error uploading multiple files:", error);
    throw error;
  }
};

// Extract public ID from a Cloudinary URL
export const getPublicIdFromUrl = (url) => {
  console.log("Extracting public ID from URL:", url);
  if (!url) return null;
  
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    const publicId = matches ? matches[1] : null;
    console.log("Extracted public ID:", publicId);
    return publicId;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};

// Function to handle image update (delete old image and upload new one)
export const updateImage = async (oldImageUrl, newFile, folder = 'general') => {
  console.log("Updating image. Old URL:", oldImageUrl, "New file:", newFile, "Folder:", folder);
  try {
    if (oldImageUrl) {
      const publicId = getPublicIdFromUrl(oldImageUrl);
      if (publicId) {
        console.log("Deleting old image with publicId:", publicId);
        await cloudinary.v2.uploader.destroy(publicId);
        console.log("Old image deleted.");
      }
    }
    
    const result = await cloudinary.v2.uploader.upload(newFile.path, { folder });
    console.log("New image uploaded. Result:", result);
    return result.secure_url;
  } catch (error) {
    console.error("Error updating image:", error);
    throw error;
  }
};
