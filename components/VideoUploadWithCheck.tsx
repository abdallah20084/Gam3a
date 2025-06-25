'use client';

import { useState, useRef, useEffect } from 'react';
import { contentFilter, ContentFilterResult } from '@/lib/contentFilter';
import { videoProcessor } from '@/lib/videoProcessor';

interface VideoUploadWithCheckProps {
  onUploadSuccess?: (file: File, result: ContentFilterResult, thumbnail?: string) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // بالبايت
  allowedTypes?: string[];
  showPreview?: boolean;
  autoUpload?: boolean;
  compressLargeVideos?: boolean;
  maxCompressedSize?: number; // بالبايت
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filterResult, setFilterResult] = useState<ContentFilterResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<'idle' | 'loading' | 'loaded' | 'fallback'>('idle');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل النماذج عند بدء المكون
  useEffect(() => {
    const loadModels = async () => {
      try {
        setFilterStatus('loading');
        
        // تحميل FFmpeg
        await videoProcessor.load();
        
        // محاولة تحميل نموذج الفلترة
        const filterSuccess = await contentFilter.tryLoad();
        
        setFilterStatus(filterSuccess ? 'loaded' : 'fallback');
        console.log('Models loaded:', { filterSuccess });
      } catch (error) {
        console.error('Failed to load models:', error);
        setFilterStatus('fallback');
      }
    };

    loadModels();
  }, []);

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
    setProgress(0);
    setStatus("جاري تحليل الفيديو...");

    try {
      // 1. تحليل معلومات الفيديو
      setProgress(10);
      setStatus("جاري تحليل معلومات الفيديو...");
      const info = await videoProcessor.getVideoInfo(file);
      setVideoInfo(info);

      // 2. فحص المحتوى
      setProgress(30);
      setStatus("جاري فحص المحتوى...");
      const videoCheck = await contentFilter.isVideoSafe(file, 3);
      setFilterResult(videoCheck.frameResults[0]);

      if (!videoCheck.isSafe) {
        setProgress(100);
        setStatus("⚠️ الفيديو يحتوي على محتوى غير مناسب ولن يتم رفعه.");
        onUploadError?.('الفيديو يحتوي على محتوى غير مناسب');
        return;
      }

      // 3. إنشاء thumbnail
      setProgress(50);
      setStatus("جاري إنشاء صورة مصغرة...");
      const thumbnail = await videoProcessor.generateThumbnail(file, '00:00:01');
      const thumbnailUrl = URL.createObjectURL(thumbnail);
      setThumbnailUrl(thumbnailUrl);

      // 4. معالجة الفيديو (ضغط إذا كان كبيراً)
      let processedFile = file;
      if (compressLargeVideos && file.size > maxCompressedSize) {
        setProgress(70);
        setStatus("جاري ضغط الفيديو...");
        processedFile = await videoProcessor.compressVideo(file, maxCompressedSize / (1024 * 1024));
      }

      setProgress(90);
      setStatus("جاري رفع الفيديو...");

      // 5. رفع الملف
      const formData = new FormData();
      formData.append("file", processedFile);

      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`خطأ في الرفع: ${response.status}`);
      }

      const data = await response.json();
      setProgress(100);
      setStatus("✅ تم رفع الفيديو بنجاح.");
      onUploadSuccess?.(processedFile, videoCheck.frameResults[0], thumbnailUrl);

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
        const input = fileInputRef.current;
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

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setThumbnailUrl(null);
    setFilterResult(null);
    setVideoInfo(null);
    setStatus("");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryColor = (category: string, probability: number) => {
    if (probability > 0.7) return 'danger';
    if (probability > 0.5) return 'warning';
    if (probability > 0.3) return 'info';
    return 'success';
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      'Drawing': 'رسوم',
      'Hentai': 'هنتاي',
      'Neutral': 'محايد',
      'Porn': 'إباحي',
      'Sexy': 'مثير'
    };
    return names[category] || category;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="video-upload-with-check">
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="bi bi-camera-video me-2"></i>
            رفع الفيديوهات مع فحص المحتوى
          </h6>
        </div>
        <div className="card-body">
          {/* مؤشر حالة الفلتر */}
          <div className="alert alert-info mb-3">
            <small>
              <i className="bi bi-info-circle me-1"></i>
              <strong>حالة الفلتر:</strong>
              <span className={`ms-2 badge ${
                filterStatus === 'loaded' ? 'bg-success' :
                filterStatus === 'loading' ? 'bg-warning' :
                filterStatus === 'fallback' ? 'bg-warning' :
                'bg-secondary'
              }`}>
                {filterStatus === 'loaded' ? 'النموذج المتقدم' :
                 filterStatus === 'loading' ? 'جاري التحميل...' :
                 filterStatus === 'fallback' ? 'النظام المحلي' :
                 'غير محدد'}
              </span>
            </small>
          </div>

          {/* منطقة رفع الملفات */}
          <div 
            className={`upload-area ${isProcessing ? 'processing' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
            style={{
              border: '2px dashed #ccc',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {isProcessing ? (
              <div>
                <div className="spinner-border text-primary mb-2" role="status">
                  <span className="visually-hidden">جاري التحميل...</span>
                </div>
                <h6>{status}</h6>
                <div className="progress mt-2" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="small text-muted mt-2">{progress}% مكتمل</p>
              </div>
            ) : (
              <div>
                <i className="bi bi-cloud-upload display-6 text-muted mb-3"></i>
                <h6>اسحب وأفلت الفيديو هنا</h6>
                <p className="small text-muted mb-2">أو انقر لاختيار ملف</p>
                <div className="mb-2">
                  {allowedTypes.map(type => (
                    <span key={type} className="badge bg-secondary me-1">
                      {type.split('/')[1].toUpperCase()}
                    </span>
                  ))}
                </div>
                <small className="text-muted">
                  الحد الأقصى: {(maxFileSize / (1024 * 1024)).toFixed(1)}MB
                </small>
              </div>
            )}
          </div>

          {/* معاينة الفيديو */}
          {previewUrl && showPreview && (
            <div className="mt-3">
              <h6>معاينة الفيديو:</h6>
              <video 
                src={previewUrl} 
                controls 
                className="img-fluid rounded"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}

          {/* معلومات الفيديو */}
          {videoInfo && (
            <div className="mt-3">
              <h6>معلومات الفيديو:</h6>
              <div className="row">
                <div className="col-md-6">
                  <small><strong>المدة:</strong> {formatDuration(videoInfo.duration)}</small><br />
                  <small><strong>الحجم:</strong> {formatFileSize(videoInfo.fileSize)}</small>
                </div>
                <div className="col-md-6">
                  <small><strong>الدقة:</strong> {videoInfo.width}x{videoInfo.height}</small><br />
                  <small><strong>معدل الإطارات:</strong> {videoInfo.fps} FPS</small>
                </div>
              </div>
            </div>
          )}

          {/* الصورة المصغرة */}
          {thumbnailUrl && (
            <div className="mt-3">
              <h6>الصورة المصغرة:</h6>
              <img 
                src={thumbnailUrl} 
                alt="صورة مصغرة" 
                className="img-fluid rounded"
                style={{ maxHeight: '150px', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* نتائج الفحص */}
          {filterResult && (
            <div className="mt-3">
              <h6>نتائج الفحص:</h6>
              
              {/* حالة الأمان */}
              <div className={`alert ${filterResult.isSafe ? 'alert-success' : 'alert-danger'} mb-3`}>
                <i className={`bi ${filterResult.isSafe ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                <strong>
                  {filterResult.isSafe ? 'الفيديو آمن' : 'الفيديو يحتوي على محتوى غير مناسب'}
                </strong>
                <br />
                <small>مستوى الثقة: {(filterResult.confidence * 100).toFixed(1)}%</small>
              </div>

              {/* تفاصيل التصنيفات */}
              <div className="categories-breakdown">
                <small className="text-muted">التصنيفات:</small>
                {Object.entries(filterResult.categories).map(([category, probability]) => (
                  <div key={category} className="d-flex justify-content-between align-items-center mb-1">
                    <span>{getCategoryName(category)}:</span>
                    <div className="d-flex align-items-center">
                      <div className="progress me-2" style={{ width: '60px', height: '6px' }}>
                        <div 
                          className={`progress-bar bg-${getCategoryColor(category, probability)}`}
                          style={{ width: `${probability * 100}%` }}
                        ></div>
                      </div>
                      <small>{(probability * 100).toFixed(1)}%</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="mt-3 d-flex gap-2">
            {file && !isProcessing && (
              <>
                <button 
                  onClick={handleCheckAndUpload}
                  className="btn btn-primary"
                  disabled={isProcessing}
                >
                  <i className="bi bi-shield-check me-2"></i>
                  فحص ورفع
                </button>
                <button 
                  onClick={clearFile}
                  className="btn btn-outline-secondary"
                >
                  <i className="bi bi-trash me-2"></i>
                  مسح
                </button>
              </>
            )}
          </div>

          {/* رسالة الحالة */}
          {status && (
            <div className="mt-3">
              <p className={`mb-0 ${status.includes('✅') ? 'text-success' : status.includes('⚠️') ? 'text-warning' : status.includes('❌') ? 'text-danger' : 'text-info'}`}>
                {status}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 