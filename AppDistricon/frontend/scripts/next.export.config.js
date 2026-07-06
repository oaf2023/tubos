// Static export config for AppDistricon (Flask serving)
// Temporarily replaces the original next.config.ts during build
const config = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
}

module.exports = config
