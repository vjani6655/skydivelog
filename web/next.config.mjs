/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@react-pdf/font', '@react-pdf/layout'],
    // Tell Vercel's file-tracing to include font TTFs that @react-pdf loads via
    // path.join(process.cwd(), 'node_modules') — without this the font files are
    // not bundled into the serverless function and PDF rendering fails in production.
    outputFileTracingIncludes: {
      '/api/export/logbook': [
        './node_modules/@expo-google-fonts/inter-tight/**/*.ttf',
        './node_modules/@expo-google-fonts/jetbrains-mono/**/*.ttf',
      ],
    },
  },
};

export default nextConfig;
