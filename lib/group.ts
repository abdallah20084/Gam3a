import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getRecommendedGroups() {
  return prisma.group.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      _count: {
        select: { members: true }
      }
    }
  });
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      _count: {
        select: { members: true }
      },
      members: {
        select: { id: true, name: true }
      }
    }
  });
}

export async function createGroup(data: {
  name: string;
  description: string;
  adminId: string;
  tags: string[];
}) {
  return prisma.group.create({
    data: {
      name: data.name,
      description: data.description,
      admin: data.adminId,
      tags: data.tags,
      members: {
        connect: { id: data.adminId }
      }
    }
  });
}

export async function joinGroup(userId: string, groupId: string) {
  return prisma.group.update({
    where: { id: groupId },
    data: {
      members: {
        connect: { id: userId }
      }
    }
  });
}