// communityMember.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

/**
 * Join a community.
 * A user can join a community if they are not already a member.
 */
export const joinCommunity = async (req, res, next) => {
  const { communityId } = req.body;
  if (!communityId) {
    return next(createError(400, 'Missing required field: communityId'));
  }
  try {
    // Check if the community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return next(createError(404, 'Community not found'));
    }

    // Check if the user is already a member
    const existingMembership = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId: req.userId },
      },
    });
    if (existingMembership) {
      return next(createError(400, 'You are already a member of this community'));
    }

    // Create a new membership record with default role "member"
    const newMembership = await prisma.communityMember.create({
      data: {
        communityId,
        userId: req.userId,
        role: 'member',
      },
    });
    res.status(201).json(newMembership);
  } catch (error) {
    next(createError(500, 'Failed to join community', { details: error.message }));
  }
};

/**
 * Get all members of a specific community.
 */
export const getCommunityMembers = async (req, res, next) => {
  const { communityId } = req.params;
  if (!communityId) {
    return next(createError(400, 'Missing required parameter: communityId'));
  }
  try {
    const members = await prisma.communityMember.findMany({
      where: { communityId },
      include: { user: true },
    });
    res.status(200).json(members);
  } catch (error) {
    next(createError(500, 'Failed to fetch community members', { details: error.message }));
  }
};

/**
 * Update a community member's role.
 * Only the community creator is allowed to update member roles.
 */
export const updateCommunityMemberRole = async (req, res, next) => {
  const { id } = req.params; // ID of the community member record
  const { role } = req.body;
  if (!role) {
    return next(createError(400, 'Missing required field: role'));
  }
  try {
    // Retrieve the membership record along with its community data
    const membership = await prisma.communityMember.findUnique({
      where: { id },
      include: { community: true },
    });
    if (!membership) {
      return next(createError(404, 'Community membership not found'));
    }

    // Only the community creator can update a member's role
    if (membership.community.creatorId !== req.userId) {
      return next(createError(403, 'Only the community creator can update member roles'));
    }

    const updatedMembership = await prisma.communityMember.update({
      where: { id },
      data: { role },
    });
    res.status(200).json(updatedMembership);
  } catch (error) {
    next(createError(500, 'Failed to update community member role', { details: error.message }));
  }
};

/**
 * Remove a community member.
 * This can be performed either by the member themselves (leaving)
 * or by the community creator (removing a member).
 */
export const removeCommunityMember = async (req, res, next) => {
  const { id } = req.params; // ID of the community member record
  try {
    const membership = await prisma.communityMember.findUnique({
      where: { id },
      include: { community: true },
    });
    if (!membership) {
      return next(createError(404, 'Community membership not found'));
    }
    // Allow removal if the current user is the member or the community creator
    if (membership.userId !== req.userId && membership.community.creatorId !== req.userId) {
      return next(createError(403, 'You are not authorized to remove this member'));
    }
    await prisma.communityMember.delete({ where: { id } });
    res.status(200).json({ message: 'Community membership removed successfully' });
  } catch (error) {
    next(createError(500, 'Failed to remove community member', { details: error.message }));
  }
};
