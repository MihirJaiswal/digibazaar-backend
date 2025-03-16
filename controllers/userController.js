//user.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';
import bcrypt from 'bcryptjs';
import { userUpload } from '../config/cloudinary.config.js';

const prisma = new PrismaClient();

export const deleteUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) return next(createError(404, 'User not found!'));

    if (req.userId !== user.id) {
      return next(createError(403, 'You can delete only your account!'));
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.status(200).send('User has been deleted.');
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) return next(createError(404, 'User not found!'));

    res.status(200).send(user);
  } catch (err) {
    next(err);
  }
};

export const uploadUserImage = userUpload.fields([
  { name: 'profilePic', maxCount: 1 }
]);

export const updateUser = async (req, res, next) => {
  try {
    console.log("Update user request received");
    console.log("Request params:", req.params);
    console.log("Request user ID:", req.userId);
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    
    console.log("Found user:", user ? `ID: ${user.id}, Current profilePic: ${user.profilePic}` : "No user found");
    
    if (!user) return next(createError(404, 'User not found!'));
    
    if (req.userId !== user.id) {
      console.log("Authorization failed: req.userId:", req.userId, "user.id:", user.id);
      return next(createError(403, 'You can update only your account!'));
    }
    
    let profilePic = user.profilePic;
    
    if (req.body.profilePic) {
      console.log("Profile pic found in request body:", req.body.profilePic);
      profilePic = req.body.profilePic;
    }
    
    if (req.files && req.files.profilePic && req.files.profilePic.length > 0) {
      console.log("Profile pic file uploaded:", req.files.profilePic[0]);
      
      if (req.files.profilePic[0].secure_url) {
        profilePic = req.files.profilePic[0].secure_url;
      } else if (req.files.profilePic[0].path) {
        profilePic = req.files.profilePic[0].path;
      } else {
        console.log("Warning: Uploaded file doesn't have expected URL properties");
        console.log("Full file object:", JSON.stringify(req.files.profilePic[0]));
      }
      
      console.log("Updated profile picture URL:", profilePic);
    } else {
      console.log("No new profile picture file uploaded");
    }
    
    const { profilePic: bodyProfilePic, ...restBody } = req.body;
    
    const cleanedData = {};
    
    for (const [key, value] of Object.entries(restBody)) {
      if (key === 'walletBalance' && value !== undefined) {
        cleanedData[key] = parseFloat(value);
      } else if (key === 'isSeller' && value !== undefined) {
        cleanedData[key] = value === 'true' || value === true;
      } else if (value !== undefined) {
        cleanedData[key] = value;
      }
    }
    
    const updatedData = { ...cleanedData, profilePic };
    
    console.log("Final updatedData before DB update:", updatedData);
    
    if (req.body.password) {
      console.log("Hashing new password");
      updatedData.password = bcrypt.hashSync(req.body.password, 5);
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updatedData,
    });
    
    console.log("User updated successfully, new profile pic:", updatedUser.profilePic);
    
    const { password, ...userInfo } = updatedUser;
    
    res.status(200).json(userInfo);
  } catch (err) {
    console.error("Error updating user:", err);
    next(err);
  }
};