// components/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="ml-3 text-lg text-gray-700">جاري التحميل...</p>
    </div>
  );
};

export default LoadingSpinner;