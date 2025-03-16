// conversation.controller.js
import createError from '../utils/createError.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createConversation = async (req, res, next) => {
  try {
    const currentUserId = req.userId;
    const otherUserId = req.body.to;

    const [user1, user2] =
      currentUserId < otherUserId
        ? [currentUserId, otherUserId]
        : [otherUserId, currentUserId];
    const conversationId = user1 + user2;

    const conversation = await prisma.conversation.upsert({
      where: { id: conversationId },
      update: {
        readByUser1: currentUserId === user1,
        readByUser2: currentUserId === user2,
      },
      create: {
        id: conversationId,
        user1Id: user1,
        user2Id: user2,
        readByUser1: currentUserId === user1,
        readByUser2: currentUserId === user2,
      },
    });

    res.status(201).send(conversation);
  } catch (err) {
    next(err);
  }
};

export const updateConversation = async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation) return next(createError(404, 'Conversation not found!'));

    let updateData = {};
    if (conversation.user1Id === req.userId) {
      updateData = { readByUser1: true };
    } else if (conversation.user2Id === req.userId) {
      updateData = { readByUser2: true };
    } else {
      return next(createError(403, 'You are not part of this conversation'));
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).send(updatedConversation);
  } catch (err) {
    next(err);
  }
};

export const getSingleConversation = async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation)
      return next(createError(404, 'Conversation not found!'));
    res.status(200).send(conversation);
  } catch (err) {
    next(err);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: req.userId }, { user2Id: req.userId }],
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).send(conversations);
  } catch (err) {
    next(err);
  }
};
