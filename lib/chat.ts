import { PrismaClient } from '@prisma/client';
import { moderateContent } from './moderation/imageModeration';

const prisma = new PrismaClient();

export async function getMessages(groupId: string) {
  return prisma.message.findMany({
    where: { groupId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: {
        select: { id: true, name: true }
      }
    }
  });
}

export async function sendMessage(
  groupId: string,
  senderId: string,
  content: string,
  mediaType?: 'image' | 'video' | 'pdf' | 'audio' | 'link',
  mediaUrl?: string
) {
  // Moderate content if it exists
  if (content) {
    const isSafe = await moderateContent(content);
    if (!isSafe) {
      throw new Error('المحتوى غير مسموح به');
    }
  }

  return prisma.message.create({
    data: {
      groupId,
      senderId,
      content,
      mediaType,
      mediaUrl
    },
    include: {
      sender: {
        select: { id: true, name: true }
      }
    }
  });
}