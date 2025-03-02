import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  console.log("🔍 Incoming Request Cookies:", req.cookies);
  
  try {
    // Use the original JWT check only.
    let token = req.headers.authorization;
    if (!token) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      console.log("❌ No token found in request!");
      return next(createError(401, "Authentication token is missing!"));
    }
    
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded.id;
    next();
    
  } catch (error) {
    console.error("❌ Token Verification Error:", error);
    return next(createError(401, "Authentication failed"));
  }
};
