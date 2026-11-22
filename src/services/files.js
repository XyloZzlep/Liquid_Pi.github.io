import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const MAGIC = {
  '.zip': [0x50, 0x4b, 0x03, 0x04],
  '.gz': [0x1f, 0x8b],
  '.tgz': [0x1f, 0x8b],
  '.deb': [0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e, 0x0a], // "!<arch>\n"
  '.appimage': [0x7f, 0x45, 0x4c, 0x46], // ELF
  '.7z': [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
};

export const extOf = (name) => path.extname(String(name)).toLowerCase();

export const isAllowedName = (name) => extOf(name) in MAGIC;

// Extensión completa para el nombre de descarga (.tar.gz en vez de .gz)
export function fullExt(name) {
  const lower = String(name).toLowerCase();
  return lower.endsWith('.tar.gz') ? '.tar.gz' : extOf(lower);
}

export function cleanOriginalName(name) {
  return path.basename(String(name)).replace(/[^\w.\- ()]/g, '_').slice(0, 200) || 'archivo';
}

export async function readHeader(filePath, bytes = 8) {
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await fh.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

export function hasValidMagic(name, header) {
  const magic = MAGIC[extOf(name)];
  if (!magic || header.length < magic.length) return false;
  return magic.every((b, i) => header[i] === b);
}

export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (d) => hash.update(d))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

export const removeFile = (filePath) => fs.promises.unlink(filePath).catch(() => {});