/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
    outputFileTracingIncludes: {
      '/api/resume/extract': [
        './node_modules/pdf-parse/**/*',
        './node_modules/pdfjs-dist/**/*',
        './node_modules/@napi-rs/**/*',
      ],
    },
  },
};
export default nextConfig;
