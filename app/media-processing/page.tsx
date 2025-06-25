"use client";

import React, { useState, useEffect } from 'react';
import VideoProcessor from '@/components/VideoProcessor';
import ImageFilter from '@/components/ImageFilter';
import { videoProcessor } from '@/lib/videoProcessor';
import { contentFilter } from '@/lib/contentFilter';

export default function MediaProcessingPage() {
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'test'>('test');
  const [filterStatus, setFilterStatus] = useState<'idle' | 'loading' | 'loaded' | 'fallback' | 'error'>('idle');
  const [processedFiles, setProcessedFiles] = useState<Array<{
    id: string;
    name: string;
    type: 'video' | 'image';
    url: string;
    thumbnail?: string;
    isSafe: boolean;
    size: string;
    filterResult?: any;
  }>>([]);

  const [testResults, setTestResults] = useState<Array<{
    id: string;
    name: string;
    type: 'video' | 'image';
    isSafe: boolean;
    confidence: number;
    reason: string;
    categories?: any;
  }>>([]);

  // تحديث حالة الفلتر
  useEffect(() => {
    const updateStatus = () => {
      setFilterStatus(contentFilter.getStatus());
    };

    // تحديث الحالة كل ثانية
    const interval = setInterval(updateStatus, 1000);
    updateStatus(); // تحديث فوري

    return () => clearInterval(interval);
  }, []);

  const handleVideoProcessed = (file: File, thumbnail?: string) => {
    const newFile = {
      id: Date.now().toString(),
      name: file.name,
      type: 'video' as const,
      url: URL.createObjectURL(file),
      thumbnail,
      isSafe: true,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    };
    setProcessedFiles(prev => [...prev, newFile]);
  };

  const handleImageFiltered = (file: File, isSafe: boolean) => {
    const newFile = {
      id: Date.now().toString(),
      name: file.name,
      type: 'image' as const,
      url: URL.createObjectURL(file),
      isSafe,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    };
    setProcessedFiles(prev => [...prev, newFile]);
  };

  const handleError = (error: string) => {
    alert(error);
  };

  const removeFile = (id: string) => {
    setProcessedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.url);
        if (file.thumbnail) {
          URL.revokeObjectURL(file.thumbnail);
        }
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleTestFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('يرجى اختيار ملف صورة أو فيديو');
      return;
    }

    try {
      let result;
      let categories;

      if (isImage) {
        result = await contentFilter.checkImageFromFile(file);
        categories = result.categories;
      } else {
        const videoCheck = await contentFilter.isVideoSafe(file, 3);
        result = videoCheck.frameResults[0];
        categories = result.categories;
      }

      const testResult = {
        id: Date.now().toString(),
        name: file.name,
        type: isImage ? 'image' as const : 'video' as const,
        isSafe: result.isSafe,
        confidence: result.confidence,
        reason: result.isSafe ? 'محتوى آمن' : 'محتوى غير مناسب',
        categories
      };

      setTestResults(prev => [...prev, testResult]);
    } catch (error) {
      console.error('Test error:', error);
      alert('حدث خطأ أثناء اختبار الملف');
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const retryModelLoad = async () => {
    try {
      contentFilter.reset();
      setFilterStatus('loading');
      const success = await contentFilter.tryLoad();
      if (success) {
        console.log('Model loaded successfully on retry');
      } else {
        console.log('Model load failed, using fallback mode');
      }
    } catch (error) {
      console.error('Failed to retry model load:', error);
    } finally {
      // تحديث الحالة في جميع الحالات
      setFilterStatus(contentFilter.getStatus());
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="bi bi-gear me-2"></i>
            معالجة الوسائط وفلترة المحتوى
          </h2>

          {/* مؤشر حالة الفلتر */}
          <div className="alert alert-info mb-4">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="bi bi-info-circle me-2"></i>
                <div>
                  <strong>حالة نظام الفلترة:</strong>
                  <span className={`ms-2 badge ${
                    filterStatus === 'loaded' ? 'bg-success' :
                    filterStatus === 'loading' ? 'bg-warning' :
                    filterStatus === 'fallback' ? 'bg-warning' :
                    filterStatus === 'error' ? 'bg-danger' :
                    'bg-secondary'
                  }`}>
                    {filterStatus === 'loaded' ? 'النموذج المتقدم محمل' :
                     filterStatus === 'loading' ? 'جاري التحميل...' :
                     filterStatus === 'fallback' ? 'النظام المحلي نشط' :
                     filterStatus === 'error' ? 'خطأ في التحميل' :
                     'غير محدد'}
                  </span>
                  {filterStatus === 'fallback' && (
                    <div className="mt-1">
                      <small className="text-muted">
                        ✅ النظام يعمل محلياً بدون إنترنت - فحص الألوان والسطوع وحجم الملفات
                      </small>
                    </div>
                  )}
                  {filterStatus === 'loaded' && (
                    <div className="mt-1">
                      <small className="text-muted">
                        ✅ النموذج المتقدم محمل - فحص دقيق للمحتوى الإباحي
                      </small>
                    </div>
                  )}
                </div>
              </div>
              {(filterStatus === 'fallback' || filterStatus === 'error') && (
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={retryModelLoad}
                  disabled={filterStatus === 'loading'}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  محاولة تحميل النموذج المتقدم
                </button>
              )}
            </div>
          </div>

          {/* تبويبات */}
          <ul className="nav nav-tabs mb-4" id="mediaTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'test' ? 'active' : ''}`}
                onClick={() => setActiveTab('test')}
              >
                <i className="bi bi-shield-check me-2"></i>
                اختبار الفلترة
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'image' ? 'active' : ''}`}
                onClick={() => setActiveTab('image')}
              >
                <i className="bi bi-image me-2"></i>
                فلترة الصور
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <i className="bi bi-camera-video me-2"></i>
                معالجة الفيديو
              </button>
            </li>
          </ul>

          {/* محتوى التبويبات */}
          <div className="tab-content" id="mediaTabContent">
            {/* تبويب اختبار الفلترة */}
            <div className={`tab-pane fade ${activeTab === 'test' ? 'show active' : ''}`}>
              <div className="row">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="mb-0">
                        <i className="bi bi-test-tube me-2"></i>
                        اختبار فلترة المحتوى
                      </h5>
                    </div>
                    <div className="card-body">
                      <p className="text-muted">
                        اختبر نظام فلترة المحتوى الإباحي على الصور والفيديوهات
                      </p>
                      
                      <div className="mb-3">
                        <label htmlFor="testFile" className="form-label">اختر ملف للاختبار:</label>
                        <input
                          type="file"
                          className="form-control"
                          id="testFile"
                          accept="image/*,video/*"
                          onChange={handleTestFile}
                        />
                      </div>

                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={clearTestResults}
                      >
                        <i className="bi bi-trash me-2"></i>
                        مسح النتائج
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="mb-0">
                        <i className="bi bi-list-check me-2"></i>
                        نتائج الاختبار
                      </h5>
                    </div>
                    <div className="card-body">
                      {testResults.length === 0 ? (
                        <p className="text-muted">لا توجد نتائج اختبار بعد</p>
                      ) : (
                        <div className="test-results">
                          {testResults.map((result) => (
                            <div key={result.id} className="test-result mb-3 p-3 border rounded">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <strong>{result.name}</strong>
                                  <br />
                                  <small className="text-muted">
                                    {result.type === 'image' ? 'صورة' : 'فيديو'}
                                  </small>
                                </div>
                                <span className={`badge ${result.isSafe ? 'bg-success' : 'bg-danger'}`}>
                                  {result.isSafe ? 'آمن' : 'غير آمن'}
                                </span>
                              </div>
                              
                              <div className="mb-2">
                                <small>
                                  <strong>مستوى الثقة:</strong> {(result.confidence * 100).toFixed(1)}%
                                </small>
                              </div>

                              {result.categories && (
                                <div className="categories-breakdown">
                                  <small className="text-muted">التصنيفات:</small>
                                  {Object.entries(result.categories).map(([category, probability]) => (
                                    <div key={category} className="d-flex justify-content-between">
                                      <span>{category}:</span>
                                      <span>{(probability as number * 100).toFixed(1)}%</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* تبويب فلترة الصور */}
            <div className={`tab-pane fade ${activeTab === 'image' ? 'show active' : ''}`}>
              <ImageFilter 
                onFiltered={handleImageFiltered}
                onError={handleError}
              />
            </div>

            {/* تبويب معالجة الفيديو */}
            <div className={`tab-pane fade ${activeTab === 'video' ? 'show active' : ''}`}>
              <VideoProcessor 
                onProcessed={handleVideoProcessed}
                onError={handleError}
              />
            </div>
          </div>

          {/* الملفات المعالجة */}
          {processedFiles.length > 0 && (
            <div className="mt-5">
              <h4>
                <i className="bi bi-files me-2"></i>
                الملفات المعالجة
              </h4>
              <div className="row">
                {processedFiles.map((file) => (
                  <div key={file.id} className="col-md-4 mb-3">
                    <div className="card">
                      <div className="card-body">
                        {file.type === 'video' ? (
                          <video 
                            src={file.url} 
                            controls 
                            className="img-fluid rounded"
                            style={{ maxHeight: '200px' }}
                          />
                        ) : (
                          <img 
                            src={file.url} 
                            alt={file.name}
                            className="img-fluid rounded"
                            style={{ maxHeight: '200px', objectFit: 'cover' }}
                          />
                        )}
                        
                        <div className="mt-2">
                          <h6 className="card-title">{file.name}</h6>
                          <p className="card-text small">
                            <strong>الحجم:</strong> {file.size}
                          </p>
                          <div className={`badge ${file.isSafe ? 'bg-success' : 'bg-danger'}`}>
                            {file.isSafe ? 'آمن' : 'غير آمن'}
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={() => removeFile(file.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* معلومات الميزات */}
          <div className="mt-5">
            <div className="row">
              <div className="col-md-4">
                <div className="card text-center">
                  <div className="card-body">
                    <i className="bi bi-shield-check display-4 text-success"></i>
                    <h5 className="card-title mt-3">فلترة ذكية</h5>
                    <p className="card-text">
                      نظام فلترة محتوى متقدم باستخدام الذكاء الاصطناعي
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center">
                  <div className="card-body">
                    <i className="bi bi-camera-video display-4 text-primary"></i>
                    <h5 className="card-title mt-3">معالجة الفيديو</h5>
                    <p className="card-text">
                      معالجة وتحويل الفيديوهات مع ضغط تلقائي
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center">
                  <div className="card-body">
                    <i className="bi bi-speedometer2 display-4 text-warning"></i>
                    <h5 className="card-title mt-3">أداء عالي</h5>
                    <p className="card-text">
                      معالجة سريعة وفعالة للملفات الكبيرة
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .test-result {
          background: #f8f9fa;
        }
        
        .categories-breakdown {
          background: white;
          border-radius: 4px;
          padding: 10px;
          border: 1px solid #dee2e6;
        }
        
        .test-results {
          max-height: 400px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
} 