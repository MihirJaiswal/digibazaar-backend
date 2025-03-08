// message.controller.js
import createError from '../utils/createError.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createMessage = async (req, res, next) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.userId;

    // Create a new message in the conversation
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        userId,
        content,
      },
    });

    // Fetch the conversation to update read flags and lastMessage
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return next(createError(404, 'Conversation not found'));

    let updateData = { lastMessage: content };
    // Determine which user flag to update
    if (conversation.user1Id === userId) {
      updateData.readByUser1 = true;
      updateData.readByUser2 = false;
    } else if (conversation.user2Id === userId) {
      updateData.readByUser2 = true;
      updateData.readByUser1 = false;
    } else {
      return next(createError(403, 'User not part of the conversation'));
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    res.status(201).json(newMessage);
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(messages);
  } catch (err) {
    next(err);
  }
};
