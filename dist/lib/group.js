"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendedGroups = getRecommendedGroups;
exports.getGroupById = getGroupById;
exports.createGroup = createGroup;
exports.joinGroup = joinGroup;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getRecommendedGroups() {
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
async function getGroupById(id) {
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
async function createGroup(data) {
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
async function joinGroup(userId, groupId) {
    return prisma.group.update({
        where: { id: groupId },
        data: {
            members: {
                connect: { id: userId }
            }
        }
    });
}
