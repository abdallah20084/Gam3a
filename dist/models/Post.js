"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// models/Post.ts
const mongoose_1 = __importStar(require("mongoose"));
const PostSchema = new mongoose_1.Schema({
    content: {
        type: String,
        trim: true,
    },
    mediaUrl: {
        type: String, // رابط للملف (صورة، فيديو) الذي تم رفعه
    },
    mediaType: {
        type: String, // نوع الوسائط: "image", "video", "pdf", "voice", "link"
        enum: ['image', 'video', 'pdf', 'voice', 'link', 'text'], // أنواع الوسائط المسموح بها
        default: 'text', // افتراضيا، يمكن أن يكون المنشور نصًا فقط
    },
    isNsfw: {
        type: Boolean,
        default: false, // هل تم تصنيف المحتوى على أنه NSFW؟ (مخفي/محظور إذا كان true)
    },
    group: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Group', // يشير إلى نموذج Group
        required: true,
    },
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // يشير إلى نموذج User
        required: true,
    },
}, { timestamps: true });
const Post = mongoose_1.default.models.Post || mongoose_1.default.model('Post', PostSchema);
exports.default = Post;
