/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // تعطيل فحص الأنواع أثناء البناء
  typescript: {
    ignoreBuildErrors: true,
  },
  // تعطيل العمال تمامًا
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  // تكوين webpack بدون عمال
  webpack: (config, { isServer }) => {
    // تكوين لـ Socket.IO
    if (!isServer) {
      config.externals = [...(config.externals || []), { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' }];
    }
    
    // تعطيل ذاكرة التخزين المؤقت لـ webpack

    
    return config;
  },
  // تكوين لـ Socket.IO
  async rewrites() {
    return [
      {
        source: '/api/socket/:path*',
        destination: '/api/socket/:path*',
      },
    ];
  },
  // تأكد من أن الملفات الثابتة يمكن الوصول إليها
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;




