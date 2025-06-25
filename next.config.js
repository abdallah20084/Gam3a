/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // تعطيل الوضع الصارم لتجنب التهيئة المزدوجة
  webpack: (config, { isServer }) => {
    // تكوين webpack لدعم Socket.IO
    if (!isServer) {
      config.externals = [...(config.externals || []), { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' }];
    }
    return config;
  },
  // إضافة تكوين لمعالجة طلبات Socket.IO
  async rewrites() {
    return [
      {
        source: '/api/socket/:path*',
        destination: '/api/socket/:path*',
      },
    ];
  },
  // تعطيل العمال المتعددة في وضع التطوير
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  // تعيين وقت انتظار أطول للعمال
  staticPageGenerationTimeout: 120,
};

module.exports = nextConfig;
