import { createWriteStream } from 'fs';
import * as path from 'path';

import archiver from 'archiver';

const archiveHandlers = {
  'zip': () => archiver('zip'),
  'tar.gz': () => archiver('tar', { gzip: true })
};

export function validateTypes(types) {
  for (const type of types) {
    if (!archiveHandlers[type]) {
      const supported = Object.keys(archiveHandlers).join(', ');
      throw new Error(`invalid archive type ${type} (supports ${supported})`);
    }
  }
}

export function archiveAssets(type, binaryPath, includes, cwd) {
  const archivePath = `${binaryPath}.${type}`;
  const archiveStream = createWriteStream(archivePath);
  const archive = archiveHandlers[type]();

  archive.pipe(archiveStream);
  archive.file(binaryPath, { name: path.basename(binaryPath) });

  for (const include in includes) {
    archive.glob(include, { cwd });
  }

  return new Promise((resolve, reject) => {
    archiveStream.on('finish', () => {
      resolve({
        path: archivePath,
        extension: `.${type}`,
      })
    });

    archiveStream.on('error', (err) => {
      reject(err);
    });

    archive.finalize();
  });
}
