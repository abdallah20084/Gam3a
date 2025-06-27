interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner-border-sm' : size === 'lg' ? 'spinner-border-lg' : '';
  
  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className={`spinner-border text-primary ${sizeClass}`} role="status">
        <span className="visually-hidden">جاري التحميل...</span>
      </div>
    </div>
  );
}

