"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// lib/db.ts
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gam3a5g';
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
let cached = global;
if (!cached.mongoose) {
    cached.mongoose = { conn: null, promise: null };
}
async function connectDB() {
    if (cached.mongoose.conn) {
        console.log('Using existing DB connection');
        return cached.mongoose.conn;
    }
    if (!cached.mongoose.promise) {
        const opts = {
            bufferCommands: false,
        };
        cached.mongoose.promise = mongoose_1.default.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }
    cached.mongoose.conn = await cached.mongoose.promise;
    console.log('New DB connection established');
    return cached.mongoose.conn;
}
exports.default = connectDB;
