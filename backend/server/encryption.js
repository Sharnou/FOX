import crypto from 'crypto';
const algorithm = 'aes-256-cbc';
const key = Buffer.from((process.env.ENCRYPTION_KEY || 'default32charencryptionkey12345!').slice(0, 32));
export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
export function decrypt(text) {
  const [ivHex, enc] = text.split(':');
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
  return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
}
