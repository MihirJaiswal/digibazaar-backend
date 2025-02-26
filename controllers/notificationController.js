// notification.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new notification
export const createNotification = async (req, res, next) => {
  const { userId, content } = req.body;
  if (!userId || !content) {
    return next(createError(400, 'Missing required fields: userId and content'));
  }
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        content,
        isRead: false,
      },
    });
    res.status(201).json(notification);
  } catch (error) {
    next(createError(500, 'Failed to create notification', { details: error.message }));
  }
};

// Get all notifications for the authenticated user
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(notifications);
  } catch (error) {
    next(createError(500, 'Failed to fetch notifications', { details: error.message }));
  }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (req, res, next) => {
  const { id } = req.params;
  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return next(createError(404, 'Notification not found'));
    }
    // Ensure the notification belongs to the authenticated user
    if (notification.userId !== req.userId) {
      return next(createError(403, 'You are not authorized to update this notification'));
    }
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.status(200).json(updatedNotification);
  } catch (error) {
    next(createError(500, 'Failed to mark notification as read', { details: error.message }));
  }
};

// Mark all notifications as read for the authenticated user
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.status(200).json({ message: 'All notifications marked as read', count: result.count });
  } catch (error) {
    next(createError(500, 'Failed to mark notifications as read', { details: error.message }));
  }
};

// Delete a notification (only by the owner)
export const deleteNotification = async (req, res, next) => {
  const { id } = req.params;
  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return next(createError(404, 'Notification not found'));
    if (notification.userId !== req.userId) {
      return next(createError(403, 'You are not authorized to delete this notification'));
    }
    await prisma.notification.delete({ where: { id } });
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete notification', { details: error.message }));
  }
};
