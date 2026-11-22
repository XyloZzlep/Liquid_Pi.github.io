import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { env } from './env.js';

// En pruebas usamos una carpeta temporal para no ensuciar tu proyecto
export const uploadDir =
  env.NODE_ENV === 'test'
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'lp-uploads-'))
    : path.resolve(env.UPLOAD_DIR);

fs.mkdirSync(uploadDir, { recursive: true });

export const MAX_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;