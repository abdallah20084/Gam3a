"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.verifyOtp = verifyOtp;
exports.getCurrentUser = getCurrentUser;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const twilio_1 = require("@/config/twilio");
const prisma = new client_1.PrismaClient();
const SALT_ROUNDS = 12;
async function registerUser(data) {
    try {
        const hashedPassword = await bcryptjs_1.default.hash(data.password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: {
                name: data.name,
                phone: data.phone,
                password: hashedPassword,
            }
        });
        // Send OTP via Twilio/WhatsApp
        await twilio_1.twilioClient.messages.create({
            body: `كود التحقق الخاص بك هو: 123456`, // في الواقع سيكون كود عشوائي
            from: 'whatsapp:+1234567890',
            to: `whatsapp:${data.phone}`
        });
        return { success: true, userId: user.id };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
async function verifyOtp(phone, otp) {
    // في الواقع سيكون هناك تحقق من صحة OTP
    if (otp === '123456') {
        const user = await prisma.user.findUnique({ where: { phone } });
        return { success: true, user };
    }
    return { success: false, error: 'كود التحقق غير صحيح' };
}
async function getCurrentUser(sessionToken) {
    // في الواقع سيكون هناك تحقق من الجلسة
    return prisma.user.findUnique({
        where: { id: sessionToken } // مؤقت - سيتم تغييره لنظام جلسات حقيقي
    });
}
