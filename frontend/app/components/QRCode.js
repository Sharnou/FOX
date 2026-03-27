'use client';
export default function QRCode({ url }) {
  if (!url) return null;
  return (
    <div className="text-center mt-4">
      <img src={url} className="mx-auto w-32" alt="QR Code" />
      <p className="text-xs text-gray-500 mt-1">امسح للوصول للإعلان</p>
    </div>
  );
}
