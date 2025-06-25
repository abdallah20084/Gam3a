// components/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="alert alert-danger" role="alert">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      {message}
    </div>
  );
}
