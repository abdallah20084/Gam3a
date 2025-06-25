"use client";

import React, { useState, useRef, useEffect } from 'react';
import { videoProcessor, VideoProcessingOptions } from '@/lib/videoProcessor';
import { contentFilter, ContentFilterResult } from '@/lib/contentFilter';

interface VideoProcessorProps {
  onProcessed: (file: File, thumbnail?: string) => void;
  onError: (error: string) => void;
}

const VideoProcessor: React.FC<VideoProcessorProps> = ({ onProcessed, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [filterResult, setFilterResult] = useState<ContentFilterResult | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل النماذج عند بدء المكون
  useEffect(() => {
    const loadModels = async () => {
      try {
        // تحميل FFmpeg فقط (يعمل محلياً)
        await videoProcessor.load();
        
        // محاولة تحميل نموذج الفلترة (مع fallback)
        const filterLoaded = await contentFilter.tryLoad();
        
        setModelLoaded(true);
        console.log('Models loaded successfully', { filterLoaded });
      } catch (error) {
        console.error('Failed to load models:', error);
        // لا نعرض خطأ للمستخدم لأن النظام سيعمل مع fallback
        setModelLoaded(true);
      }
    };

    loadModels();
  }, [onError]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      onError('يرجى اختيار ملف فيديو صحيح');
      return;
    }

    // فحص حجم الملف
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      onError('حجم الفيديو كبير جداً. الحد الأقصى 100MB');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('جاري تحليل الفيديو...');

    try {
      // انتظار تحميل النماذج إذا لم تكن محملة
      if (!modelLoaded) {
        // تحميل FFmpeg فقط (يعمل محلياً)
        await videoProcessor.load();
        
        // محاولة تحميل نموذج الفلترة (مع fallback)
        await contentFilter.tryLoad();
        
        setModelLoaded(true);
      }

      // 1. تحليل معلومات الفيديو
      setCurrentStep('جاري تحليل معلومات الفيديو...');
      setProgress(10);
      const info = await videoProcessor.getVideoInfo(file);
      setVideoInfo(info);

      // 2. فحص المحتوى الإباحي
      setCurrentStep('جاري فحص المحتوى...');
      setProgress(30);
      const videoCheck = await contentFilter.isVideoSafe(file, 3); // فحص 3 إطارات فقط للسرعة
      setFilterResult(videoCheck.frameResults[0]); // عرض نتيجة أول إطار

      if (!videoCheck.isSafe) {
        setCurrentStep('تم رفض الفيديو - محتوى غير مناسب');
        setProgress(100);
        onError('الفيديو يحتوي على محتوى غير مناسب');
        return;
      }

      // 3. إنشاء thumbnail
      setCurrentStep('جاري إنشاء صورة مصغرة...');
      setProgress(50);
      const thumbnail = await videoProcessor.generateThumbnail(file, '00:00:01');

      // 4. معالجة الفيديو (ضغط إذا كان كبيراً)
      setCurrentStep('جاري معالجة الفيديو...');
      setProgress(70);
      let processedFile = file;
      
      if (file.size > 50 * 1024 * 1024) { // إذا كان أكبر من 50MB
        setCurrentStep('جاري ضغط الفيديو...');
        processedFile = await videoProcessor.compressVideo(file, 50); // ضغط إلى 50MB
      }

      setCurrentStep('تم الانتهاء بنجاح!');
      setProgress(100);

      // تمرير النتيجة
      onProcessed(processedFile, thumbnail);

    } catch (error) {
      console.error('Video processing error:', error);
      onError('حدث خطأ أثناء معالجة الفيديو');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        // محاكاة اختيار الملف
        const input = fileInputRef.current;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        onError('يرجى اختيار ملف فيديو صحيح');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
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
    <div className="video-processor">
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-camera-video me-2"></i>
            معالج الفيديو وفلترة المحتوى
          </h5>
        </div>
        <div className="card-body">
          {/* منطقة رفع الملفات */}
          <div 
            className={`upload-area ${isProcessing ? 'processing' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <div className={`upload-content ${isProcessing ? 'processing-content' : ''}`}>
              {isProcessing ? (
                <>
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">جاري التحميل...</span>
                  </div>
                  <h6>{currentStep}</h6>
                  <div className="progress mt-3" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="small text-muted mt-2">{progress}% مكتمل</p>
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-upload display-4 text-muted mb-3"></i>
                  <h6>اسحب وأفلت الفيديو هنا</h6>
                  <p className="small text-muted">أو انقر لاختيار ملف</p>
                  <div className="mt-2">
                    <span className="badge bg-secondary me-2">MP4</span>
                    <span className="badge bg-secondary me-2">WebM</span>
                    <span className="badge bg-secondary me-2">AVI</span>
                    <span className="badge bg-secondary">MOV</span>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">الحد الأقصى: 100MB</small>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* معلومات الفيديو */}
          {videoInfo && (
            <div className="video-info mt-3">
              <h6>معلومات الفيديو:</h6>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>المدة:</strong> {formatDuration(videoInfo.duration)}</p>
                  <p><strong>الدقة:</strong> {videoInfo.width}x{videoInfo.height}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>معدل الإطارات:</strong> {videoInfo.fps} fps</p>
                  <p><strong>الحجم:</strong> {formatFileSize(videoInfo.fileSize)}</p>
                </div>
              </div>
            </div>
          )}

          {/* نتائج الفلترة */}
          {filterResult && (
            <div className="filter-result mt-3">
              <h6>نتائج فحص المحتوى:</h6>
              
              {/* حالة الأمان */}
              <div className={`alert ${filterResult.isSafe ? 'alert-success' : 'alert-danger'} mb-3`}>
                <i className={`bi ${filterResult.isSafe ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                <strong>
                  {filterResult.isSafe ? 'الفيديو آمن' : 'الفيديو يحتوي على محتوى غير مناسب'}
                </strong>
                <br />
                <small>مستوى الثقة: {(filterResult.confidence * 100).toFixed(1)}%</small>
              </div>

              {/* تفصيل التصنيفات */}
              <div className="categories-breakdown">
                <h6 className="mb-3">تفصيل التصنيفات (الإطار الأول):</h6>
                {Object.entries(filterResult.categories).map(([category, probability]) => (
                  <div key={category} className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="category-name">{getCategoryName(category)}</span>
                      <span className={`percentage text-${getCategoryColor(category, probability)}`}>
                        {(probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div 
                        className={`progress-bar bg-${getCategoryColor(category, probability)}`}
                        style={{ width: `${probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-3">
                  <strong>الفئة المهيمنة:</strong> {getCategoryName(filterResult.dominantCategory)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .video-processor {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .upload-area {
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }
        
        .upload-area:hover {
          border-color: #0d6efd;
          background: #e7f3ff;
        }
        
        .upload-area.processing {
          border-color: #0d6efd;
          background: #e7f3ff;
          cursor: not-allowed;
        }
        
        .upload-content {
          color: #6c757d;
        }
        
        .processing-content {
          color: #0d6efd;
        }
        
        .video-info, .filter-result {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
        }
        
        .categories-breakdown {
          background: white;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #dee2e6;
        }
        
        .category-name {
          font-weight: 500;
          min-width: 80px;
        }
        
        .percentage {
          font-weight: 500;
          min-width: 50px;
          text-align: right;
        }
        
        .progress {
          background: #e9ecef;
          border-radius: 4px;
        }
        
        .progress-bar {
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default VideoProcessor; 