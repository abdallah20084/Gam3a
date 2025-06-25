"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoProcessor = exports.VideoProcessor = void 0;
const ffmpeg_1 = require("@ffmpeg/ffmpeg");
const util_1 = require("@ffmpeg/util");
class VideoProcessor {
    constructor() {
        this.ffmpeg = null;
        this.isLoaded = false;
        // لا نقوم بتهيئة FFmpeg في الـ constructor لتجنب مشاكل SSR
    }
    async load() {
        if (this.isLoaded)
            return;
        // التحقق من أننا في بيئة المتصفح
        if (typeof window === 'undefined') {
            throw new Error('VideoProcessor can only be used in browser environment');
        }
        try {
            // تهيئة FFmpeg فقط عند الحاجة
            if (!this.ffmpeg) {
                this.ffmpeg = new ffmpeg_1.FFmpeg();
            }
            // تحميل FFmpeg core
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await this.ffmpeg.load({
                coreURL: await (0, util_1.toBlobURL)(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await (0, util_1.toBlobURL)(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            this.isLoaded = true;
            console.log('FFmpeg loaded successfully');
        }
        catch (error) {
            console.error('Failed to load FFmpeg:', error);
            throw error;
        }
    }
    async convertVideo(file, options = {}) {
        if (!this.isLoaded) {
            await this.load();
        }
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not initialized');
        }
        const { format = 'mp4', quality = 'medium', resolution = '720p', bitrate, fps = 30 } = options;
        try {
            // كتابة الملف إلى FFmpeg
            const inputFileName = `input.${file.name.split('.').pop()}`;
            const outputFileName = `output.${format}`;
            await this.ffmpeg.writeFile(inputFileName, await (0, util_1.fetchFile)(file));
            // تحديد جودة الفيديو
            let qualitySettings = '';
            switch (quality) {
                case 'low':
                    qualitySettings = '-crf 28 -preset fast';
                    break;
                case 'medium':
                    qualitySettings = '-crf 23 -preset medium';
                    break;
                case 'high':
                    qualitySettings = '-crf 18 -preset slow';
                    break;
            }
            // تحديد الدقة
            let resolutionSettings = '';
            switch (resolution) {
                case '480p':
                    resolutionSettings = '-vf scale=854:480';
                    break;
                case '720p':
                    resolutionSettings = '-vf scale=1280:720';
                    break;
                case '1080p':
                    resolutionSettings = '-vf scale=1920:1080';
                    break;
            }
            // بناء أمر FFmpeg
            const ffmpegCommand = [
                '-i', inputFileName,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-r', fps.toString(),
                ...qualitySettings.split(' '),
                ...resolutionSettings.split(' '),
                ...(bitrate ? ['-b:v', `${bitrate}k`] : []),
                '-y', // استبدال الملف إذا كان موجود
                outputFileName
            ];
            // تنفيذ التحويل
            await this.ffmpeg.exec(ffmpegCommand);
            // قراءة الملف المحول
            const data = await this.ffmpeg.readFile(outputFileName);
            // تنظيف الملفات المؤقتة
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName);
            return new Blob([data], { type: `video/${format}` });
        }
        catch (error) {
            console.error('Video conversion failed:', error);
            throw error;
        }
    }
    async compressVideo(file, targetSizeMB = 10) {
        if (!this.isLoaded) {
            await this.load();
        }
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not initialized');
        }
        try {
            const inputFileName = `input.${file.name.split('.').pop()}`;
            const outputFileName = 'compressed.mp4';
            await this.ffmpeg.writeFile(inputFileName, await (0, util_1.fetchFile)(file));
            // حساب معدل البت المطلوب
            const targetSizeBytes = targetSizeMB * 1024 * 1024;
            const duration = await this.getVideoDuration(file);
            const targetBitrate = Math.floor((targetSizeBytes * 8) / duration);
            const ffmpegCommand = [
                '-i', inputFileName,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:v', `${targetBitrate}`,
                '-maxrate', `${targetBitrate}`,
                '-bufsize', `${targetBitrate * 2}`,
                '-preset', 'medium',
                '-y',
                outputFileName
            ];
            await this.ffmpeg.exec(ffmpegCommand);
            const data = await this.ffmpeg.readFile(outputFileName);
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName);
            return new Blob([data], { type: 'video/mp4' });
        }
        catch (error) {
            console.error('Video compression failed:', error);
            throw error;
        }
    }
    async generateThumbnail(file, time = '00:00:01') {
        if (!this.isLoaded) {
            await this.load();
        }
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not initialized');
        }
        try {
            const inputFileName = `input.${file.name.split('.').pop()}`;
            const outputFileName = 'thumbnail.jpg';
            await this.ffmpeg.writeFile(inputFileName, await (0, util_1.fetchFile)(file));
            const ffmpegCommand = [
                '-i', inputFileName,
                '-ss', time,
                '-vframes', '1',
                '-vf', 'scale=320:240',
                '-y',
                outputFileName
            ];
            await this.ffmpeg.exec(ffmpegCommand);
            const data = await this.ffmpeg.readFile(outputFileName);
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName);
            return new Blob([data], { type: 'image/jpeg' });
        }
        catch (error) {
            console.error('Thumbnail generation failed:', error);
            throw error;
        }
    }
    async getVideoDuration(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                resolve(video.duration);
                URL.revokeObjectURL(video.src);
            };
            video.src = URL.createObjectURL(file);
        });
    }
    async getVideoInfo(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                resolve({
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    fps: 30, // افتراضي
                    fileSize: file.size
                });
                URL.revokeObjectURL(video.src);
            };
            video.src = URL.createObjectURL(file);
        });
    }
}
exports.VideoProcessor = VideoProcessor;
// إنشاء instance واحد للاستخدام العام
exports.videoProcessor = new VideoProcessor();
