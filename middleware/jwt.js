import jwt from 'jsonwebtoken';
import createError from '../utils/createError.js';

export const verifyToken = (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token) {
      return next(createError(401, 'Authentication token is missing!'));
    }
    
    // Support tokens with the "Bearer " prefix
    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    // Ensure the JWT secret key is configured
    if (!process.env.JWT_KEY) {
      return next(createError(500, 'JWT secret key is not configured.'));
    }

    // Verify the token synchronously
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log(decoded);

    // Attach decoded user data to the request as req.userId and req.isSeller (if needed)
    req.userId = decoded.id;
    req.isSeller = decoded.isSeller;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Authentication token has expired. Please log in again.'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(createError(401, 'Invalid authentication token.'));
    } else {
      return next(createError(500, 'Internal server error.'));
    }
  }
};
