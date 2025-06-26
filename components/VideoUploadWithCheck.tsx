'use client';
import { useState } from 'react';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface VideoUploadWithCheckProps {
  onUploadSuccess?: (file: File) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
  showPreview?: boolean;
  autoUpload?: boolean;
  compressLargeVideos?: boolean;
  maxCompressedSize?: number;
}

const ffmpeg = new FFmpeg();

// دالة استخراج لقطة من الفيديو
async function extractFrameFromVideo(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.currentTime = 1;

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = canvas.toDataURL();
      img.onload = () => resolve(img);
    };
  });
}

// دالة ضغط الفيديو
async function convertTo360p(file: File): Promise<Blob> {
  if (!ffmpeg.loaded) await ffmpeg.load();

  ffmpeg.writeFile(file.name, await fetchFile(file));

  await ffmpeg.exec([
    '-i', file.name,
    '-vf', 'scale=-2:360',
    '-preset', 'fast',
    'out.mp4'
  ]);

  const data = ffmpeg.readFile('out.mp4');
  return new Blob([data], { type: 'video/mp4' });
}

export default function VideoUploadWithCheck({
  onUploadSuccess,
  onUploadError,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  allowedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov'],
  showPreview = true,
  autoUpload = false,
  compressLargeVideos = true,
  maxCompressedSize = 50 * 1024 * 1024 // 50MB
}: VideoUploadWithCheckProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("لا توجد عملية حالياً");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // فحص نوع الملف
    if (!allowedTypes.includes(selectedFile.type)) {
      onUploadError?.('نوع الملف غير مدعوم');
      return;
    }

    // فحص حجم الملف
    if (selectedFile.size > maxFileSize) {
      onUploadError?.(`حجم الملف كبير جداً. الحد الأقصى ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`);
      return;
    }

    setFile(selectedFile);
    
    // إنشاء معاينة
    if (showPreview) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }

    // رفع تلقائي إذا كان مفعلاً
    if (autoUpload) {
      await handleCheckAndUpload();
    }
  };

  const handleCheckAndUpload = async () => {
    if (!file) {
      onUploadError?.('يرجى اختيار ملف أولاً');
      return;
    }

    setIsProcessing(true);
    setStatus("فحص الفيديو... استخراج لقطة أولى");

    try {
      // استخراج لقطة من الفيديو
      const frame = await extractFrameFromVideo(file);
      
      // تحميل نموذج NSFW.js
      const model = await nsfwjs.load();
      
      // فحص اللقطة
      const predictions = await model.classify(frame);
      const unsafe = predictions.find(
        (p) =>
          (p.className === 'Porn' && p.probability > 0.5) ||
          (p.className === 'Sexy' && p.probability > 0.5)
      );

      if (unsafe) {
        setStatus("⚠️ الفيديو يحتوي على محتوى غير لائق. تم رفضه.");
        onUploadError?.('الفيديو يحتوي على محتوى غير مناسب');
        return;
      }

      let uploadFile = file;

      // فحص حجم الفيديو وضغطه إذا كان كبيراً
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => (video.onloadedmetadata = resolve));
      const height = video.videoHeight;

      if (height > 360 && compressLargeVideos) {
        setStatus("يتم ضغط الفيديو إلى 360p...");
        const compressed = await convertTo360p(file);
        uploadFile = new File([compressed], 'compressed.mp4', {
          type: 'video/mp4',
        });
      } else if (height > 360) {
        setStatus("الفيديو أقل من 360p، لا حاجة للضغط.");
      }

      setStatus("⬆️ يتم رفع الملف...");

      // رفع الملف
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`خطأ في الرفع: ${response.status}`);
      }

      const data = await response.json();
      setStatus("✅ تم الرفع: " + data.message);
      onUploadSuccess?.(uploadFile);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setStatus(`❌ ${errorMessage}`);
      onUploadError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const selectedFile = files[0];
      if (allowedTypes.includes(selectedFile.type)) {
        // محاكاة اختيار الملف
        const input = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(selectedFile);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        onUploadError?.('نوع الملف غير مدعوم');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus("");
  };

  return (
    <div className="video-upload-with-check">
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="bi bi-camera-video me-2"></i>
            رفع الفيديو مع فحص المحتوى
          </h6>
        </div>
        <div className="card-body">
          <div className="alert alert-info mb-3">
            <small>
              <i className="bi bi-info-circle me-1"></i>
              <strong>معلومات:</strong> يتم فحص الفيديو في المتصفح باستخدام أقوي وأحدث التقنيات قبل الرفع
            </small>
          </div>

          <div
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('video-input')?.click()}
          >
            <input
              id="video-input"
              type="file"
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {!file ? (
              <div className="upload-placeholder">
                <i className="bi bi-camera-video fs-1 text-muted"></i>
                <p className="mt-2 mb-0">اضغط هنا أو اسحب الفيديو لرفعه</p>
                <small className="text-muted">
                  الأنواع المدعومة: MP4, WebM, AVI, MOV
                </small>
              </div>
            ) : (
              <div className="file-selected">
                {showPreview && previewUrl && (
                  <video 
                    src={previewUrl} 
                    controls
                    className="img-thumbnail mb-2"
                    style={{ maxHeight: '200px' }}
                  />
                )}
                <p className="mb-1"><strong>{file.name}</strong></p>
                <small className="text-muted">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </small>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-3">
              <button
                onClick={handleCheckAndUpload}
                disabled={isProcessing}
                className="btn btn-primary me-2"
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    جاري الفحص...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-check me-2"></i>
                    فحص ورفع
                  </>
                )}
              </button>
              
              <button
                onClick={clearFile}
                disabled={isProcessing}
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-x-circle me-2"></i>
                إلغاء
              </button>
            </div>
          )}

          {status && (
            <div className="mt-3">
              <div className={`alert ${
                status.includes('✅') ? 'alert-success' :
                status.includes('⚠️') ? 'alert-warning' :
                status.includes('❌') ? 'alert-danger' :
                'alert-info'
              }`}>
                <small>{status}</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 