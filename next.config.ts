// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // تم إزالة experimental.allowedDevOrigins لأنه لم يعد معترفًا به في هذا الإصدار من Next.js
  // CORS لـ Socket.IO يتم التعامل معه مباشرة في server.ts
};

module.exports = nextConfig;
