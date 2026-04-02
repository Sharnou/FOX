import QRCode from 'qrcode';

export async function generateQR(url) {
  return QRCode.toDataURL(url, { width: 256, margin: 1 });
}
