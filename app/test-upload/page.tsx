'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';

const ImageUploadWithCheck = dynamic(() => import('@/components/ImageUploadWithCheck'), { ssr: false });
const VideoUploadWithCheck = dynamic(() => import('@/components/VideoUploadWithCheck'), { ssr: false });

export default function TestUploadPage() {
  const [uploadHistory, setUploadHistory] = useState<Array<{
    id: string;
    type: 'image' | 'video';
    name: string;
    isSafe: boolean;
    confidence: number;
    timestamp: Date;
  }>>([]);

  const handleImageUploadSuccess = (file: File) => {
    const newUpload = {
      id: Date.now().toString(),
      type: 'image' as const,
      name: file.name,
      isSafe: true,
      confidence: 1,
      timestamp: new Date()
    };
    setUploadHistory(prev => [newUpload, ...prev]);
  };

  const handleVideoUploadSuccess = (file: File) => {
    const newUpload = {
      id: Date.now().toString(),
      type: 'video' as const,
      name: file.name,
      isSafe: true,
      confidence: 1,
      timestamp: new Date()
    };
    setUploadHistory(prev => [newUpload, ...prev]);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // يمكن إضافة إشعار للمستخدم هنا
  };

  const clearHistory = () => {
    setUploadHistory([]);
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="bi bi-upload me-2"></i>
            اختبار رفع الملفات مع فحص المحتوى
          </h2>

          <div className="row">
            {/* رفع الصور */}
            <div className="col-md-6 mb-4">
              <ImageUploadWithCheck
                onUploadSuccess={handleImageUploadSuccess}
                onUploadError={handleUploadError}
                maxFileSize={5 * 1024 * 1024} // 5MB
                showPreview={true}
                autoUpload={false}
              />
            </div>

            {/* رفع الفيديوهات */}
            <div className="col-md-6 mb-4">
              <VideoUploadWithCheck
                onUploadSuccess={handleVideoUploadSuccess}
                onUploadError={handleUploadError}
                maxFileSize={50 * 1024 * 1024} // 50MB
                showPreview={true}
                autoUpload={false}
                compressLargeVideos={true}
                maxCompressedSize={20 * 1024 * 1024} // 20MB
              />
            </div>
          </div>

          {/* سجل الرفع */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>
                <i className="bi bi-clock-history me-2"></i>
                سجل الرفع
              </h4>
              <button 
                onClick={clearHistory}
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="bi bi-trash me-2"></i>
                مسح السجل
              </button>
            </div>

            {uploadHistory.length === 0 ? (
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                لا توجد ملفات مرفوعة بعد
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>النوع</th>
                      <th>اسم الملف</th>
                      <th>الحالة</th>
                      <th>مستوى الثقة</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadHistory.map((upload) => (
                      <tr key={upload.id}>
                        <td>
                          <i className={`bi ${upload.type === 'image' ? 'bi-image' : 'bi-camera-video'} me-2`}></i>
                          {upload.type === 'image' ? 'صورة' : 'فيديو'}
                        </td>
                        <td>
                          <small>{upload.name}</small>
                        </td>
                        <td>
                          <span className={`badge ${upload.isSafe ? 'bg-success' : 'bg-danger'}`}>
                            {upload.isSafe ? 'آمن' : 'غير آمن'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress me-2" style={{ width: '60px', height: '6px' }}>
                              <div 
                                className={`progress-bar ${upload.confidence > 0.7 ? 'bg-success' : upload.confidence > 0.5 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${upload.confidence * 100}%` }}
                              ></div>
                            </div>
                            <small>{(upload.confidence * 100).toFixed(1)}%</small>
                          </div>
                        </td>
                        <td>
                          <small>{upload.timestamp.toLocaleString('ar-SA')}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* معلومات النظام */}
          <div className="mt-5">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  معلومات النظام
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>ميزات رفع الصور:</h6>
                    <ul className="small">
                      <li>فحص محتوى إباحي متقدم</li>
                      <li>نظام محلي كبديل (بدون إنترنت)</li>
                      <li>معاينة مباشرة</li>
                      <li>تحليل تفصيلي للتصنيفات</li>
                      <li>حد أقصى 5MB</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>ميزات رفع الفيديوهات:</h6>
                    <ul className="small">
                      <li>فحص إطارات متعددة</li>
                      <li>ضغط تلقائي للملفات الكبيرة</li>
                      <li>إنشاء صور مصغرة</li>
                      <li>تحليل معلومات الفيديو</li>
                      <li>حد أقصى 50MB</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h6>أنظمة الفلترة:</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="alert alert-success">
                        <strong>النموذج المتقدم:</strong> NSFW.js مع TensorFlow.js
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="alert alert-warning">
                        <strong>النظام المحلي:</strong> فحص الألوان والسطوع وحجم الملفات
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 