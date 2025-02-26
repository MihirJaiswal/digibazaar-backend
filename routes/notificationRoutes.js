// routes/notificationRoutes.js
import express from 'express';
import { 
  createNotification, 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../controllers/notificationController.js';

const router = express.Router();

// Create a new notification
router.post('/', createNotification);

// Get all notifications for the authenticated user
router.get('/', getNotifications);

// Mark a specific notification as read
router.patch('/:id/read', markNotificationAsRead);

// Mark all notifications as read for the authenticated user
router.patch('/read/all', markAllNotificationsAsRead);

// Delete a specific notification by its ID
router.delete('/:id', deleteNotification);

export default router;
