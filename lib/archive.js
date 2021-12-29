import { createWriteStream } from 'fs';
import * as path from 'path';

import archiver from 'archiver';

const validTypes = ['tar.gz', 'zip'];

export function validateTypes(types) {
  for (const type of types) {
    if (!validTypes.includes(type)) {
      throw new Error(`invalid archive type ${type} (supports ${validTypes.join(', ')})`);
    }
  }
}

export async function archiveAssets(type, binaryPath, includes, cwd) {
  const archivePath = `${binaryPath}.${type}`;
  const archiveStream = createWriteStream(archivePath);

  let archive;

  switch (type) {
    case 'tar.gz':
      archive = archiver('tar', {
        gzip: true,
      });
      break;
    case 'zip':
      archive = archiver('zip');
      break;
  }

  archive.pipe(archiveStream);
  archive.file(binaryPath, { name: path.basename(binaryPath) });

  for (const include in includes) {
    archive.glob(include, { cwd });
  }

  return await new Promise((resolve, reject) => {
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
