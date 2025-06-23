"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processVideo = processVideo;
// lib/ffmpeg.ts
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function processVideo(inputBuffer) {
    const tempInput = path_1.default.join((0, os_1.tmpdir)(), `input-${Date.now()}.mp4`);
    const tempOutput = path_1.default.join((0, os_1.tmpdir)(), `output-${Date.now()}.mp4`);
    try {
        // Write input buffer to temp file
        (0, fs_1.writeFileSync)(tempInput, inputBuffer);
        // Process video with ffmpeg
        await execAsync(`ffmpeg -i ${tempInput} -vf "scale=640:360" -c:v libx264 -crf 28 -preset fast -c:a copy ${tempOutput}`);
        // Read processed video
        const outputBuffer = await fs.promises.readFile(tempOutput);
        return outputBuffer;
    }
    finally {
        // Cleanup temp files
        try {
            (0, fs_1.unlinkSync)(tempInput);
        }
        catch (_a) { }
        try {
            (0, fs_1.unlinkSync)(tempOutput);
        }
        catch (_b) { }
    }
}
