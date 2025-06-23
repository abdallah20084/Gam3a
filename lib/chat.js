"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = getMessages;
exports.sendMessage = sendMessage;
const client_1 = require("@prisma/client");
const imageModeration_1 = require("./moderation/imageModeration");
const prisma = new client_1.PrismaClient();
async function getMessages(groupId) {
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
async function sendMessage(groupId, senderId, content, mediaType, mediaUrl) {
    // Moderate content if it exists
    if (content) {
        const isSafe = await (0, imageModeration_1.moderateContent)(content);
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
