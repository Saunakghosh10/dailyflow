/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => {
    return [
      {
        source: '/daily-flow',
        destination: '/',
        permanent: true,
      },
    ];
  },
  headers: async () => {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
