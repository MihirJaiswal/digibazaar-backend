// message.controller.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createMessage = async (req, res, next) => {
  try {
    // Create a new message using "content" field as defined in your schema
    const newMessage = await prisma.message.create({
      data: {
        conversationId: req.body.conversationId,
        userId: req.userId,
        content: req.body.content, // Updated field name
      },
    });

    // Update conversation details with the latest message
    await prisma.conversation.update({
      where: { id: req.body.conversationId },
      data: {
        // These flags assume that if the sender is a seller, then the conversation should be marked as read by the seller, etc.
        readBySeller: req.isSeller,
        readByBuyer: !req.isSeller,
        lastMessage: req.body.content, // Updated field name
      },
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
