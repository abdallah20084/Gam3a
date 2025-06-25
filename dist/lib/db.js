"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gam3a5g';
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
// تهيئة الكاش
let cached = { conn: null, promise: null };
// التحقق من وجود كاش عالمي
if (!global.mongoose) {
    global.mongoose = { conn: null, promise: null };
}
else {
    cached = global.mongoose;
}
async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };
        cached.promise = mongoose_1.default.connect(MONGODB_URI, opts);
    }
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
}
exports.default = dbConnect;
