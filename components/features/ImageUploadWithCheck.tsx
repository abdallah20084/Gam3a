'use client';
import { useState } from 'react';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

interface ImageUploadWithCheckProps {
  onUploadSuccess?: (file: File) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
  showPreview?: boolean;
  autoUpload?: boolean;
}

export default function ImageUploadWithCheck({
  onUploadSuccess,
  onUploadError,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  showPreview = true,
  autoUpload = false
}: ImageUploadWithCheckProps) {
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
    setStatus("جاري تحميل نموذج فحص الصور...");

    try {
      // تحميل نموذج NSFW.js
      const model = await nsfwjs.load();
      
      // إنشاء عنصر صورة للفحص
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // فحص الصورة
      const predictions = await model.classify(img);
      const unsafe = predictions.find(
        (p) =>
          (p.className === 'Porn' && p.probability > 0.5) ||
          (p.className === 'Sexy' && p.probability > 0.5)
      );

      if (unsafe) {
        setStatus("⚠️ الصورة غير لائقة، تم رفضها.");
        onUploadError?.('الصورة تحتوي على محتوى غير مناسب');
        return;
      }

      setStatus("✅ الصورة آمنة، جاري رفعها...");

      // رفع الملف
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`خطأ في الرفع: ${response.status}`);
      }

      const data = await response.json();
      setStatus("✅ تم رفع الصورة بنجاح.");
      onUploadSuccess?.(file);

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
    <div className="image-upload-with-check">
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="bi bi-image me-2"></i>
            رفع الصور مع فحص المحتوى
          </h6>
        </div>
        <div className="card-body">
          <div className="alert alert-info mb-3">
            <small>
              <i className="bi bi-info-circle me-1"></i>
              <strong>معلومات:</strong> يتم فحص الصور في المتصفح باستخدام أقوي وأحدث التقنيات قبل الرفع
            </small>
          </div>

          <div
            className="upload-area border-2 border-dashed border-secondary rounded p-4 text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-input')?.click()}
            style={{cursor: 'pointer', minHeight: '150px'}}
          >
            <input
              id="file-input"
              type="file"
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {!file ? (
              <div className="upload-placeholder">
                <i className="bi bi-cloud-upload fs-1 text-muted"></i>
                <p className="mt-2 mb-0">اضغط هنا أو اسحب الصورة لرفعها</p>
                <small className="text-muted">
                  الأنواع المدعومة: JPG, PNG, GIF, WebP
                </small>
              </div>
            ) : (
              <div className="file-selected">
                {showPreview && previewUrl && (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="img-thumbnail mb-2"
                    style={{ maxHeight: '200px', maxWidth: '100%' }}
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
            <div className="mt-3 d-flex flex-wrap gap-2">
              <button
                onClick={handleCheckAndUpload}
                disabled={isProcessing}
                className="btn btn-primary"
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
              } d-flex align-items-center`}>
                <div className="me-2">
                  {status.includes('✅') && <i className="bi bi-check-circle-fill text-success"></i>}
                  {status.includes('⚠️') && <i className="bi bi-exclamation-triangle-fill text-warning"></i>}
                  {status.includes('❌') && <i className="bi bi-x-circle-fill text-danger"></i>}
                  {!status.includes('✅') && !status.includes('⚠️') && !status.includes('❌') && <i className="bi bi-info-circle-fill text-info"></i>}
                </div>
                <div className="flex-grow-1">
                  <small className="d-block">{status}</small>
                  {status.includes('⚠️') && (
                    <small className="d-block text-muted mt-1">
                      الصورة تحتوي على محتوى غير مناسب. يرجى اختيار صورة أخرى.
                    </small>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 