// lib/ffmpeg.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const execAsync = promisify(exec);

export async function processVideo(inputBuffer: Buffer): Promise<Buffer> {
  const tempInput = path.join(tmpdir(), `input-${Date.now()}.mp4`);
  const tempOutput = path.join(tmpdir(), `output-${Date.now()}.mp4`);
  
  try {
    // Write input buffer to temp file
    writeFileSync(tempInput, inputBuffer);
    
    // Process video with ffmpeg
    await execAsync(
      `ffmpeg -i ${tempInput} -vf "scale=640:360" -c:v libx264 -crf 28 -preset fast -c:a copy ${tempOutput}`
    );
    
    // Read processed video
    const outputBuffer = await fs.promises.readFile(tempOutput);
    return outputBuffer;
  } finally {
    // Cleanup temp files
    try { unlinkSync(tempInput); } catch {}
    try { unlinkSync(tempOutput); } catch {}
  }
}