/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@react-pdf/font', '@react-pdf/layout'],
  },
};

export default nextConfig;
