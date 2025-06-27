"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidToken = exports.validateTokenWithServer = exports.validateToken = void 0;
// إضافة دالة للتحقق من صلاحية التوكن
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validateToken = (token) => {
    if (!token)
        return false;
    try {
        // تحقق من صلاحية التوكن بدون التحقق من التوقيع
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded)
            return false;
        // تحقق من انتهاء صلاحية التوكن
        const exp = decoded.exp;
        if (!exp)
            return false;
        // تحقق مما إذا كان التوكن منتهي الصلاحية
        return Date.now() < exp * 1000;
    }
    catch (error) {
        console.error("Token validation error:", error);
        return false;
    }
};
exports.validateToken = validateToken;
// دالة فحص التوكن مع الخادم
const validateTokenWithServer = async (token) => {
    try {
        const response = await fetch('/api/user/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status === 401) {
            // التوكن غير صالح أو المستخدم محذوف
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            return false;
        }
        return response.ok;
    }
    catch (error) {
        console.error('Error validating token with server:', error);
        return false;
    }
};
exports.validateTokenWithServer = validateTokenWithServer;
// استخدام هذه الدالة قبل إرسال الطلبات
const getValidToken = () => {
    const token = localStorage.getItem('token');
    if ((0, exports.validateToken)(token)) {
        return token;
    }
    // إذا كان التوكن غير صالح، قم بإزالته
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    return null;
};
exports.getValidToken = getValidToken;
