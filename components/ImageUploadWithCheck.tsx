'use client';

import { useState, useRef, useEffect } from 'react';
import { contentFilter, ContentFilterResult } from '@/lib/contentFilter';

interface ImageUploadWithCheckProps {
  onUploadSuccess?: (file: File, result: ContentFilterResult) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // بالبايت
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
  const [status, setStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterResult, setFilterResult] = useState<ContentFilterResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<'idle' | 'loading' | 'loaded' | 'fallback'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل نموذج الفلترة عند بدء المكون
  useEffect(() => {
    const loadFilter = async () => {
      try {
        setFilterStatus('loading');
        const success = await contentFilter.tryLoad();
        setFilterStatus(success ? 'loaded' : 'fallback');
        console.log('Filter loaded:', success);
      } catch (error) {
        console.error('Failed to load filter:', error);
        setFilterStatus('fallback');
      }
    };

    loadFilter();
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
    setStatus("جاري فحص المحتوى...");

    try {
      // فحص المحتوى
      const result = await contentFilter.checkImageFromFile(file);
      setFilterResult(result);

      if (!result.isSafe) {
        setStatus("⚠️ الصورة تحتوي على محتوى غير مناسب ولن يتم رفعها.");
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
      onUploadSuccess?.(file, result);

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
    setFilterResult(null);
    setStatus("");
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
                <p className="mb-0">{status}</p>
              </div>
            ) : (
              <div>
                <i className="bi bi-cloud-upload display-6 text-muted mb-3"></i>
                <h6>اسحب وأفلت الصورة هنا</h6>
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

          {/* معاينة الصورة */}
          {previewUrl && showPreview && (
            <div className="mt-3">
              <h6>معاينة الصورة:</h6>
              <img 
                src={previewUrl} 
                alt="معاينة" 
                className="img-fluid rounded"
                style={{ maxHeight: '200px', objectFit: 'cover' }}
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
                  {filterResult.isSafe ? 'الصورة آمنة' : 'الصورة تحتوي على محتوى غير مناسب'}
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