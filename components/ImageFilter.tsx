"use client";

import React, { useState, useRef, useEffect } from 'react';
import { contentFilter, ContentFilterResult } from '@/lib/contentFilter';

interface ImageFilterProps {
  onFiltered: (file: File, isSafe: boolean) => void;
  onError: (error: string) => void;
}

const ImageFilter: React.FC<ImageFilterProps> = ({ onFiltered, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterResult, setFilterResult] = useState<ContentFilterResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل نموذج NSFW عند بدء المكون
  useEffect(() => {
    const loadModel = async () => {
      try {
        const success = await contentFilter.tryLoad();
        setModelLoaded(true);
        console.log('NSFW model loaded:', success);
      } catch (error) {
        console.error('Failed to load NSFW model:', error);
        // لا نعرض خطأ للمستخدم لأن النظام سيعمل مع fallback
        setModelLoaded(true);
      }
    };

    loadModel();
  }, [onError]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError('يرجى اختيار ملف صورة صحيح');
      return;
    }

    // فحص حجم الملف
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onError('حجم الصورة كبير جداً. الحد الأقصى 10MB');
      return;
    }

    setIsProcessing(true);
    setFilterResult(null);

    try {
      // إنشاء معاينة للصورة
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // انتظار تحميل النموذج إذا لم يكن محملاً
      if (!modelLoaded) {
        await contentFilter.tryLoad();
        setModelLoaded(true);
      }

      // فحص المحتوى
      const result = await contentFilter.checkImageFromFile(file);
      setFilterResult(result);

      // تمرير النتيجة
      onFiltered(file, result.isSafe);

    } catch (error) {
      console.error('Image filtering error:', error);
      onError('حدث خطأ أثناء فحص الصورة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        // محاكاة اختيار الملف
        const input = fileInputRef.current;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        onError('يرجى اختيار ملف صورة صحيح');
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

  return (
    <div className="image-filter">
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-shield-check me-2"></i>
            فلترة الصور
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
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <div className={`upload-content ${isProcessing ? 'processing-content' : ''}`}>
              {isProcessing ? (
                <>
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">جاري التحميل...</span>
                  </div>
                  <h6>جاري فحص الصورة...</h6>
                  <p className="small text-muted">يرجى الانتظار بينما نقوم بفحص المحتوى</p>
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-upload display-4 text-muted mb-3"></i>
                  <h6>اسحب وأفلت الصورة هنا</h6>
                  <p className="small text-muted">أو انقر لاختيار ملف</p>
                  <div className="mt-2">
                    <span className="badge bg-secondary me-2">JPG</span>
                    <span className="badge bg-secondary me-2">PNG</span>
                    <span className="badge bg-secondary me-2">GIF</span>
                    <span className="badge bg-secondary">WebP</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* معاينة الصورة */}
          {previewUrl && (
            <div className="image-preview mt-3">
              <h6>معاينة الصورة:</h6>
              <img 
                src={previewUrl} 
                alt="معاينة" 
                className="img-fluid rounded"
                style={{ maxHeight: '200px', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* نتائج الفلترة */}
          {filterResult && (
            <div className="filter-result mt-3">
              <h6>نتائج الفحص:</h6>
              
              {/* حالة الأمان */}
              <div className={`alert ${filterResult.isSafe ? 'alert-success' : 'alert-danger'} mb-3`}>
                <i className={`bi ${filterResult.isSafe ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                <strong>
                  {filterResult.isSafe ? 'الصورة آمنة' : 'الصورة تحتوي على محتوى غير مناسب'}
                </strong>
                <br />
                <small>مستوى الثقة: {(filterResult.confidence * 100).toFixed(1)}%</small>
              </div>

              {/* تفصيل التصنيفات */}
              <div className="categories-breakdown">
                <h6 className="mb-3">تفصيل التصنيفات:</h6>
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

              {/* التوصيات */}
              <div className="recommendations mt-3">
                <h6>التوصيات:</h6>
                {filterResult.isSafe ? (
                  <div className="alert alert-info">
                    <i className="bi bi-check-circle me-2"></i>
                    يمكن رفع هذه الصورة بأمان
                  </div>
                ) : (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    يوصى بعدم رفع هذه الصورة لتجنب انتهاك سياسات المحتوى
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .image-filter {
          max-width: 600px;
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
        
        .image-preview, .filter-result {
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
        
        .recommendations {
          background: white;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #dee2e6;
        }
      `}</style>
    </div>
  );
};

export default ImageFilter; 