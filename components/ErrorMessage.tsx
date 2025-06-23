// components/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="alert alert-danger text-center fw-semibold mb-4" role="alert">
    {message}
  </div>
);

export default ErrorMessage;