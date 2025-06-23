// components/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="d-flex justify-content-center align-items-center my-4">
    <div className="spinner-border text-primary" style={{ width: 48, height: 48 }} role="status">
      <span className="visually-hidden">جاري التحميل...</span>
    </div>
    <span className="ms-3 fs-5 text-secondary">جاري التحميل...</span>
  </div>
);

export default LoadingSpinner;