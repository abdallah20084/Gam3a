'use client';

import { useEffect } from 'react';

export default function BootstrapClient() {
  useEffect(() => {
    // Load Bootstrap JavaScript on client-side only
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
      .catch(error => {
        console.error('Failed to load Bootstrap:', error);
      });
  }, []);

  return null;
}