import jwt from 'jsonwebtoken';
import createError from './createError.js';

export const verifyToken = (req, res, next) => {
  // Get token from headers or cookies
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  // If no token found, check cookies
  const cookieToken = req.cookies.accessToken;
  
  if (!token && !cookieToken) {
    return next(createError(401, "You are not authenticated!"));
  }
  
  const tokenToVerify = token || cookieToken;
  
  try {
    // Verify the token
    const decoded = jwt.verify(tokenToVerify, process.env.JWT_SECRET);
    
    // Set user info in request object
    req.user = decoded;
    
    // Continue to next middleware or route handler
    return next();
  } catch (err) {
    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      return next(createError(401, "Token has expired"));
    }
    
    if (err.name === 'JsonWebTokenError') {
      return next(createError(401, "Invalid token"));
    }
    
    // Generic error
    return next(createError(403, "Token is not valid!"));
  }
};