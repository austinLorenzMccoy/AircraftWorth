/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to silence migration warning
  turbopack: {},

  // Exclude Node.js-only packages pulled in by @hashgraph/hedera-wallet-connect
  // (pino, thread-stream, etc.) from the browser bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js built-ins — not available in browser
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        worker_threads: false,
        // pino / thread-stream internals
        'pino-pretty': false,
        'thread-stream': false,
      };

      // Prevent Webpack from bundling these server-only packages entirely
      config.externals = [
        ...(config.externals || []),
        'pino',
        'pino-pretty',
        'thread-stream',
      ];
    }
    return config;
  },
}

export default nextConfig
