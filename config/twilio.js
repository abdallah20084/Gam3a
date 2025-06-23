"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioPhoneNumber = exports.verifyServiceSid = exports.twilioClient = void 0;
// config/twilio.ts
const twilio_1 = __importDefault(require("twilio"));
// Load environment variables (already handled by Next.js in API routes, but good for explicit typing)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_SERVICE_SID;
exports.verifyServiceSid = verifyServiceSid;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
exports.twilioPhoneNumber = twilioPhoneNumber;
if (!accountSid || !authToken) {
    throw new Error('Twilio ACCOUNT_SID and AUTH_TOKEN must be defined in .env.local');
}
// Initialize the Twilio client
const client = (0, twilio_1.default)(accountSid, authToken);
exports.twilioClient = client;
