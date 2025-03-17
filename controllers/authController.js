import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userUpload } from '../config/cloudinary.config.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const prisma = new PrismaClient();

// In-memory OTP storage (consider using Redis for production)
const otpStore = new Map();

export const uploadUserImage = userUpload.fields([
  {name: 'profilePic', maxCount: 1}
]);

// Step 1: User initiates registration
export const initiateRegister = async (req, res, next) => {
  try {
    // First validate if email is already registered
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: req.body.email },
          { username: req.body.username },
          { phone: req.body.phone }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === req.body.email) {
        return next(createError(400, "Email already exists!"));
      }
      if (existingUser.username === req.body.username) {
        return next(createError(400, "Username already exists!"));
      }
      if (existingUser.phone === req.body.phone) {
        return next(createError(400, "Phone number already exists!"));
      }
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with user data (with 10-minute expiration)
    const userData = {
      ...req.body,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    // Handle profile picture if uploaded
    if (req.files && req.files.profilePic && req.files.profilePic[0]) {
      userData.profilePic = req.files.profilePic[0].path;
    }

    // Store in memory (use userId email as key)
    otpStore.set(req.body.email, userData);
    
    // Send OTP via email
    await sendOtpEmail(req.body.email, otp);
    
    res.status(200).json({ 
      message: "OTP sent to your email. Please verify to complete registration.",
      email: req.body.email
    });
  } catch (err) {
    console.error("Registration initiation error:", err);
    return next(createError(500, err.message || "Failed to initiate registration"));
  }
};

// Step 2: User verifies OTP and completes registration
export const verifyOtpAndRegister = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    // Get stored data
    const userData = otpStore.get(email);
    
    // Validate OTP
    if (!userData) {
      return next(createError(400, "OTP request expired or not found. Please try again."));
    }
    
    if (userData.expiresAt < new Date()) {
      otpStore.delete(email);
      return next(createError(400, "OTP expired. Please request a new one."));
    }
    
    if (userData.otp !== otp) {
      return next(createError(400, "Invalid OTP. Please try again."));
    }
    
    // OTP verified, create user
    const { otp: _, expiresAt: __, ...userDataToSave } = userData;
    
    // Hash password
    const hash = bcrypt.hashSync(userDataToSave.password, 5);
    
    // Format boolean fields
    const isSeller = userDataToSave.isSeller === "true";
    
    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        ...userDataToSave,
        isSeller,
        password: hash,
      },
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, isSeller: newUser.isSeller },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );
    
    // Remove sensitive data
    const { password, ...userInfo } = newUser;
    
    // Clean up OTP store
    otpStore.delete(email);
    
    // Return success with token and user info
    res
      .cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .status(201)
      .json({ token, user: userInfo });
  } catch (err) {
    console.error("Registration completion error:", err);
    return next(createError(500, err.message || "Failed to complete registration"));
  }
};

// Utility function to send OTP via email
const sendOtpEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Verification OTP',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #6e45e2 0%, #4481eb 100%); padding: 25px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">DIGIBAZAAR</h1>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px 25px;">
          <h2 style="color: #4a00e0; margin-top: 0; font-size: 22px;">Verify Your Account</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you for registering with DIGIBAZAAR. Please use the following verification code to complete your account setup:</p>
          
          <div style="background: linear-gradient(135deg, #f2f4ff 0%, #eef1ff 100%); border: 1px solid #d9deff; border-left: 5px solid #6e45e2; padding: 20px; text-align: center; margin: 25px 0; border-radius: 5px;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4a00e0;">${otp}</div>
          </div>
          
          <p style="color: #555; font-size: 14px; line-height: 1.5;">This verification code will expire in <span style="color: #4a00e0; font-weight: bold;">10 minutes</span>.</p>
          <p style="color: #777; font-size: 14px; font-style: italic; margin-top: 25px;">If you didn't request this verification, please ignore this email.</p>
        </div>
        
        <div style="background-color: #f7f7ff; padding: 15px; text-align: center; border-top: 1px solid #e6e6ff;">
          <p style="color: #666; font-size: 14px; margin: 0;">© 2025 DIGIBAZAAR - Your Digital Marketplace</p>
        </div>
      </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Resend OTP if needed
export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if user data exists
    const userData = otpStore.get(email);
    if (!userData) {
      return next(createError(400, "No pending registration found for this email"));
    }
    
    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Update stored data
    userData.otp = otp;
    userData.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    otpStore.set(email, userData);
    
    // Send new OTP
    await sendOtpEmail(email, otp);
    
    res.status(200).json({ 
      message: "New OTP sent to your email"
    });
  } catch (err) {
    console.error("OTP resend error:", err);
    return next(createError(500, err.message || "Failed to resend OTP"));
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