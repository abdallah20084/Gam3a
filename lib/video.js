"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressVideo = compressVideo;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const os_1 = require("os");
const path_1 = require("path");
const promises_1 = require("fs/promises");
async function compressVideo(inputPath) {
    const outputPath = (0, path_1.join)((0, os_1.tmpdir)(), `compressed_${Date.now()}.mp4`);
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
            '-crf 28',
            '-preset fast',
            '-vf scale=640:360',
            '-movflags faststart'
        ])
            .on('end', async () => {
            await (0, promises_1.unlink)(inputPath);
            await (0, promises_1.rename)(outputPath, inputPath);
            resolve(inputPath);
        })
            .on('error', (err) => {
            reject(err);
        })
            .save(outputPath);
    });
}
