import ffmpeg from 'fluent-ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlink, rename } from 'fs/promises'

export async function compressVideo(inputPath: string): Promise<string> {
  const outputPath = join(tmpdir(), `compressed_${Date.now()}.mp4`)
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-crf 28',
        '-preset fast',
        '-vf scale=640:360',
        '-movflags faststart'
      ])
      .on('end', async () => {
        await unlink(inputPath)
        await rename(outputPath, inputPath)
        resolve(inputPath)
      })
      .on('error', (err: any) => {
        reject(err)
      })
      .save(outputPath)
  })
}