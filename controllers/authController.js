//auth.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userUpload } from '../config/cloudinary.config.js';

const prisma = new PrismaClient();

export const uploadUserImage = userUpload.fields([
  {name: 'profilePic', maxCount: 1}
])

export const register = async (req, res, next) => {
  try {
    // Process file upload for profile picture if available.
    let profilePic = req.body.profilePic || "";
    if (req.files && req.files.profilePic && req.files.profilePic[0]) {
      profilePic = req.files.profilePic[0].path;
      console.log("Profile picture uploaded:", profilePic);
    }

    // Convert isSeller from string to boolean
    const isSeller = req.body.isSeller === "true";

    // Hash the password
    const hash = bcrypt.hashSync(req.body.password, 5);

    // Create the new user, overriding profilePic if a file was uploaded.
    const newUser = await prisma.user.create({
      data: {
        ...req.body,
        isSeller, // now a boolean
        profilePic, // file upload URL if available
        password: hash,
      },
    });

    // Generate token similar to login
    const token = jwt.sign(
      { id: newUser.id, isSeller: newUser.isSeller },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    // Exclude password from response
    const { password, ...userInfo } = newUser;

    res
      .cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .status(201)
      .json({ token, user: userInfo });
  } catch (err) {
    // Log the complete error for debugging purposes
    console.error("Register error:", err);
    console.error("Error code:", err.code);
    console.error("Error meta:", err.meta);
    console.error("Error message:", err.message);

    // Check for Prisma unique constraint errors
    if (err.code === "P2002" || (err.message && err.message.includes("Unique constraint failed"))) {
      // Try to extract the problematic field from err.meta.target first
      if (err.meta && err.meta.target) {
        const targets = err.meta.target;
        if (targets.includes("User_email_key")) {
          return next(createError(400, "Email already exists!"));
        }
        if (targets.includes("User_username_key")) {
          return next(createError(400, "Username already exists!"));
        }
        if (targets.includes("User_phone_key")) {
          return next(createError(400, "Phone number already exists!"));
        }
      }
      // Fallback: parse the error message for field clues
      const match = err.message.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const field = match[1];
        if (field.includes("email")) {
          return next(createError(400, "Email already exists!"));
        }
        if (field.includes("username")) {
          return next(createError(400, "Username already exists!"));
        }
        if (field.includes("phone")) {
          return next(createError(400, "Phone number already exists!"));
        }
      }
      return next(createError(400, "Unique constraint violation"));
    }
    // Fallback: send the error message if available, or a generic one.
    return next(createError(500, err.message || "Something went wrong"));
  }
};


export const login = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.body.username },
    });

    if (!user) return next(createError(404, "User not found!"));

    const isCorrect = bcrypt.compareSync(req.body.password, user.password);
    if (!isCorrect)
      return next(createError(400, "Wrong password or username!"));

    const token = jwt.sign(
      {
        id: user.id,
        isSeller: user.isSeller,
      },
      process.env.JWT_KEY,
      { expiresIn: "7d" } // ✅ Set token expiration
    );

    const { password, ...info } = user;

    res
      .cookie("accessToken", token, {
        httpOnly: true, // ✅ Prevent XSS attacks
        secure: process.env.NODE_ENV === "production", // ✅ Secure in production
        sameSite: "strict",
      })
      .status(200)
      .json({
        token, // ✅ Return the token in response body
        user: info,
      });
  } catch (err) {
    next(err);
  }
};


export const logout = async (req, res) => {
  res
    .clearCookie('accessToken', {
      sameSite: 'none',
      secure: true,
    })
    .status(200)
    .send('User has been logged out.');
};