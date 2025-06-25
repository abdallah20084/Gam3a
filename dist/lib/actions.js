"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroups = getGroups;
exports.getGroupMessages = getGroupMessages;
// lib/actions.ts
const Group_1 = __importDefault(require("@/models/Group"));
const Message_1 = __importDefault(require("@/models/Message"));
const db_1 = __importDefault(require("./db"));
async function getGroups() {
    try {
        const connection = await (0, db_1.default)(); // استدعاء معدل
        // تعديل استدعاء populate لتجنب StrictPopulateError
        const groups = await Group_1.default.find({}).lean();
        
        // إذا كنت بحاجة إلى معلومات الأعضاء، استخدم نهجًا آخر
        
        return JSON.parse(JSON.stringify(groups));
    }
    catch (error) {
        console.error('Error fetching groups:', error);
        return [];
    }
}
async function getGroupMessages(groupId) {
    try {
        await (0, db_1.default)();
        const messages = await Message_1.default.find({ groupId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name avatar');
        return { messages: JSON.parse(JSON.stringify(messages)) };
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        return { messages: [] };
    }
}
