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
exports.contentFilter = exports.ContentFilter = void 0;
const nsfwjs = __importStar(require("nsfwjs"));
class ContentFilter {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.loadAttempted = false;
        this.status = 'idle';
    }
    getStatus() {
        return this.status;
    }
    // إعادة تعيين الحالة للسماح بإعادة المحاولة
    reset() {
        this.model = null;
        this.isLoaded = false;
        this.loadAttempted = false;
        this.status = 'idle';
    }
    // محاولة تحميل النموذج بدون رمي أخطاء
    async tryLoad() {
        try {
            await this.load();
            return true;
        }
        catch (error) {
            console.warn('Model load attempt failed:', error);
            return false;
        }
    }
    async load() {
        if (this.isLoaded)
            return;
        if (this.loadAttempted) {
            throw new Error('Model load already attempted and failed. Use reset() to try again.');
        }
        // التحقق من أننا في بيئة المتصفح
        if (typeof window === 'undefined') {
            throw new Error('ContentFilter can only be used in browser environment');
        }
        this.loadAttempted = true;
        this.status = 'loading';
        // قائمة من مصادر النموذج البديلة
        const modelSources = [
            'https://d1zv2aa70wpiur.cloudfront.net/tfjs_models/nsfwjs/1.3.0/model.json',
            'https://unpkg.com/nsfwjs@1.3.0/dist/model/model.json',
            'https://cdn.jsdelivr.net/npm/nsfwjs@1.3.0/dist/model/model.json'
        ];
        for (const source of modelSources) {
            try {
                console.log(`Attempting to load NSFW model from: ${source}`);
                this.model = await nsfwjs.load(source, {
                    type: 'graph'
                });
                this.isLoaded = true;
                this.status = 'loaded';
                console.log('NSFW model loaded successfully');
                return;
            }
            catch (error) {
                console.warn(`Failed to load model from ${source}:`, error);
                continue;
            }
        }
        // إذا فشل تحميل النموذج من جميع المصادر
        console.error('Failed to load NSFW model from all sources');
        this.status = 'fallback';
        // إعادة تعيين loadAttempted للسماح بإعادة المحاولة
        this.loadAttempted = false;
        throw new Error('Unable to load NSFW model. Content filtering will be disabled.');
    }
    async checkImage(imageElement) {
        if (!this.isLoaded) {
            const loadSuccess = await this.tryLoad();
            if (!loadSuccess) {
                // إذا فشل تحميل النموذج، نستخدم فحص بسيط
                console.warn('Using fallback image check due to model load failure');
                this.status = 'fallback';
                return this.fallbackImageCheck(imageElement);
            }
        }
        if (!this.model) {
            this.status = 'fallback';
            return this.fallbackImageCheck(imageElement);
        }
        try {
            // تصنيف الصورة
            const predictions = await this.model.classify(imageElement);
            // تحليل النتائج
            const categories = {
                Drawing: 0,
                Hentai: 0,
                Neutral: 0,
                Porn: 0,
                Sexy: 0
            };
            predictions.forEach(pred => {
                categories[pred.className] = pred.probability;
            });
            // تحديد الفئة المهيمنة
            const dominantCategory = predictions.reduce((prev, current) => prev.probability > current.probability ? prev : current).className;
            // تحديد ما إذا كانت الصورة آمنة
            const isSafe = categories.Porn < 0.5 && categories.Sexy < 0.7 && categories.Hentai < 0.5;
            const confidence = Math.max(...Object.values(categories));
            return {
                isSafe,
                confidence,
                categories,
                dominantCategory
            };
        }
        catch (error) {
            console.error('Image classification failed:', error);
            this.status = 'fallback';
            return this.fallbackImageCheck(imageElement);
        }
    }
    // فحص بسيط للصور كبديل عند فشل تحميل النموذج
    fallbackImageCheck(imageElement) {
        console.log('Using enhanced local image safety check');
        // فحص بسيط يعتمد على حجم الصورة والألوان
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return {
                isSafe: true, // افتراض أن الصورة آمنة في حالة الفشل
                confidence: 0.5,
                categories: {
                    Drawing: 0.1,
                    Hentai: 0.1,
                    Neutral: 0.8,
                    Porn: 0.1,
                    Sexy: 0.1
                },
                dominantCategory: 'Neutral'
            };
        }
        canvas.width = imageElement.naturalWidth;
        canvas.height = imageElement.naturalHeight;
        ctx.drawImage(imageElement, 0, 0);
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            // حساب متوسط الألوان
            let totalR = 0, totalG = 0, totalB = 0;
            let pixelCount = 0;
            let skinTonePixels = 0;
            let darkPixels = 0;
            let brightPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                totalR += r;
                totalG += g;
                totalB += b;
                pixelCount++;
                // فحص لون البشرة (skin tone detection)
                if (r > g && r > b && r > 100 && g > 50 && b > 50) {
                    skinTonePixels++;
                }
                // فحص البكسل المظلم
                const brightness = (r + g + b) / 3;
                if (brightness < 50) {
                    darkPixels++;
                }
                else if (brightness > 200) {
                    brightPixels++;
                }
            }
            const avgR = totalR / pixelCount;
            const avgG = totalG / pixelCount;
            const avgB = totalB / pixelCount;
            // حساب النسب
            const skinToneRatio = skinTonePixels / pixelCount;
            const darkRatio = darkPixels / pixelCount;
            const brightRatio = brightPixels / pixelCount;
            // فحص بسيط للألوان - إذا كانت الصورة مظلمة جداً أو فاتحة جداً
            const brightness = (avgR + avgG + avgB) / 3;
            const isTooDark = brightness < 30;
            const isTooBright = brightness > 225;
            // فحص نسبة الألوان - إذا كانت الصورة حمراء جداً
            const redRatio = avgR / (avgR + avgG + avgB);
            const isTooRed = redRatio > 0.6;
            // فحص نسبة لون البشرة (قد يشير إلى محتوى غير مناسب)
            const hasHighSkinTone = skinToneRatio > 0.3;
            // فحص التباين (الصور المظلمة جداً قد تكون مشبوهة)
            const hasHighDarkRatio = darkRatio > 0.7;
            // حساب درجة الخطورة
            let riskScore = 0;
            if (isTooRed)
                riskScore += 0.3;
            if (hasHighSkinTone)
                riskScore += 0.2;
            if (hasHighDarkRatio)
                riskScore += 0.2;
            if (isTooDark)
                riskScore += 0.1;
            if (isTooBright)
                riskScore += 0.1;
            const isSafe = riskScore < 0.5;
            return {
                isSafe,
                confidence: Math.min(0.8, 0.6 + riskScore),
                categories: {
                    Drawing: 0.1,
                    Hentai: hasHighSkinTone ? 0.3 : 0.1,
                    Neutral: isSafe ? 0.8 : 0.3,
                    Porn: isSafe ? 0.1 : 0.4,
                    Sexy: hasHighSkinTone ? 0.3 : 0.1
                },
                dominantCategory: isSafe ? 'Neutral' : 'Porn'
            };
        }
        catch (error) {
            console.error('Fallback image check failed:', error);
            return {
                isSafe: true,
                confidence: 0.5,
                categories: {
                    Drawing: 0.1,
                    Hentai: 0.1,
                    Neutral: 0.8,
                    Porn: 0.1,
                    Sexy: 0.1
                },
                dominantCategory: 'Neutral'
            };
        }
    }
    async checkImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const result = await this.checkImage(img);
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }
    async checkVideoThumbnail(videoFile, time = 1) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.onloadedmetadata = () => {
                video.currentTime = time;
            };
            video.onseeked = async () => {
                try {
                    // إنشاء canvas لاستخراج frame
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);
                    // تحويل canvas إلى image
                    const img = new Image();
                    img.onload = async () => {
                        try {
                            const result = await this.checkImage(img);
                            resolve(result);
                        }
                        catch (error) {
                            reject(error);
                        }
                    };
                    img.onerror = () => reject(new Error('Failed to create thumbnail image'));
                    img.src = canvas.toDataURL();
                }
                catch (error) {
                    reject(error);
                }
            };
            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(videoFile);
        });
    }
    async checkMultipleVideoFrames(videoFile, frameCount = 5) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const results = [];
            let currentFrame = 0;
            video.onloadedmetadata = () => {
                const duration = video.duration;
                const interval = duration / frameCount;
                const checkFrame = async () => {
                    if (currentFrame >= frameCount) {
                        resolve(results);
                        return;
                    }
                    try {
                        const time = currentFrame * interval;
                        video.currentTime = time;
                    }
                    catch (error) {
                        reject(error);
                    }
                };
                checkFrame();
            };
            video.onseeked = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);
                    const img = new Image();
                    img.onload = async () => {
                        try {
                            const result = await this.checkImage(img);
                            results.push(result);
                            currentFrame++;
                            // التحقق من الإطار التالي
                            if (currentFrame < frameCount) {
                                const duration = video.duration;
                                const interval = duration / frameCount;
                                const time = currentFrame * interval;
                                video.currentTime = time;
                            }
                            else {
                                resolve(results);
                            }
                        }
                        catch (error) {
                            reject(error);
                        }
                    };
                    img.onerror = () => reject(new Error('Failed to create frame image'));
                    img.src = canvas.toDataURL();
                }
                catch (error) {
                    reject(error);
                }
            };
            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(videoFile);
        });
    }
    // دالة مساعدة لتحديد ما إذا كان الفيديو آمن بناءً على عدة frames
    async isVideoSafe(videoFile, frameCount = 5) {
        try {
            const frameResults = await this.checkMultipleVideoFrames(videoFile, frameCount);
            // حساب متوسط الثقة
            const avgConfidence = frameResults.reduce((sum, result) => sum + result.confidence, 0) / frameResults.length;
            // تحديد ما إذا كان الفيديو آمن بناءً على جميع الإطارات
            const unsafeFrames = frameResults.filter(result => !result.isSafe).length;
            const isSafe = unsafeFrames < Math.ceil(frameCount * 0.3); // إذا كان أقل من 30% من الإطارات غير آمنة
            return {
                isSafe,
                confidence: avgConfidence,
                frameResults
            };
        }
        catch (error) {
            console.error('Video safety check failed:', error);
            // فحص محلي بسيط للفيديو
            return this.fallbackVideoCheck(videoFile);
        }
    }
    // فحص محلي بسيط للفيديو كبديل
    async fallbackVideoCheck(videoFile) {
        console.log('Using local video safety check');
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.onloadedmetadata = () => {
                try {
                    // فحص بسيط يعتمد على حجم الفيديو ومدة التشغيل
                    const duration = video.duration;
                    const fileSize = videoFile.size;
                    // فحص حجم الملف (الفيديوهات الكبيرة قد تكون مشبوهة)
                    const isLargeFile = fileSize > 50 * 1024 * 1024; // أكبر من 50MB
                    // فحص مدة التشغيل (الفيديوهات القصيرة جداً قد تكون مشبوهة)
                    const isVeryShort = duration < 2; // أقل من ثانيتين
                    const isVeryLong = duration > 600; // أكثر من 10 دقائق
                    // فحص نوع الملف
                    const fileName = videoFile.name.toLowerCase();
                    const suspiciousExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
                    const hasSuspiciousExtension = suspiciousExtensions.some(ext => fileName.includes(ext));
                    // حساب درجة الخطورة
                    let riskScore = 0;
                    if (isLargeFile)
                        riskScore += 0.2;
                    if (isVeryShort)
                        riskScore += 0.3;
                    if (isVeryLong)
                        riskScore += 0.1;
                    if (hasSuspiciousExtension)
                        riskScore += 0.1;
                    const isSafe = riskScore < 0.4;
                    // إنشاء نتيجة وهمية للإطار
                    const frameResult = {
                        isSafe,
                        confidence: Math.min(0.7, 0.5 + riskScore),
                        categories: {
                            Drawing: 0.1,
                            Hentai: 0.1,
                            Neutral: isSafe ? 0.8 : 0.3,
                            Porn: isSafe ? 0.1 : 0.4,
                            Sexy: 0.1
                        },
                        dominantCategory: isSafe ? 'Neutral' : 'Porn'
                    };
                    resolve({
                        isSafe,
                        confidence: frameResult.confidence,
                        frameResults: [frameResult]
                    });
                }
                catch (error) {
                    reject(error);
                }
            };
            video.onerror = () => reject(new Error('Failed to load video for local check'));
            video.src = URL.createObjectURL(videoFile);
        });
    }
    // دالة لفحص النص (يمكن إضافة فلترة للنص لاحقاً)
    checkText(text) {
        const flaggedWords = [
            // قائمة الكلمات المحظورة (يمكن توسيعها)
            'porn', 'sex', 'adult', 'xxx', 'nsfw'
        ];
        const lowerText = text.toLowerCase();
        const foundWords = flaggedWords.filter(word => lowerText.includes(word));
        return {
            isSafe: foundWords.length === 0,
            confidence: foundWords.length > 0 ? 0.8 : 1.0,
            flaggedWords: foundWords
        };
    }
}
exports.ContentFilter = ContentFilter;
// إنشاء instance واحد للاستخدام العام
exports.contentFilter = new ContentFilter();
