import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('/tmp', `xtox-backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = ['users', 'ads', 'chats', 'reports', 'categories', 'countries'];

  for (const col of collections) {
    try {
      const data = await mongoose.connection.db.collection(col).find().toArray();
      fs.writeFileSync(path.join(backupDir, `${col}.json`), JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn(`Could not backup ${col}:`, e.message);
    }
  }

  const zipPath = `${backupDir}.zip`;
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    output.on('close', resolve);
    archive.pipe(output);
    archive.directory(backupDir, false);
    archive.finalize();
  });

  return zipPath;
}
