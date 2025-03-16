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
    let profilePic = req.body.profilePic || "";
    if (req.files && req.files.profilePic && req.files.profilePic[0]) {
      profilePic = req.files.profilePic[0].path;
      console.log("Profile picture uploaded:", profilePic);
    }

    const isSeller = req.body.isSeller === "true";

    const hash = bcrypt.hashSync(req.body.password, 5);

    const newUser = await prisma.user.create({
      data: {
        ...req.body,
        isSeller, 
        profilePic, 
        password: hash,
      },
    });

    const token = jwt.sign(
      { id: newUser.id, isSeller: newUser.isSeller },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

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
    console.error("Register error:", err);
    console.error("Error code:", err.code);
    console.error("Error meta:", err.meta);
    console.error("Error message:", err.message);

    if (err.code === "P2002" || (err.message && err.message.includes("Unique constraint failed"))) {
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
      { expiresIn: "7d" } 
    );

    const { password, ...info } = user;

    res
      .cookie("accessToken", token, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict",
      })
      .status(200)
      .json({
        token, 
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

