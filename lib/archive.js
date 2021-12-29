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

export function archiveAssets(type, binaryPath, includes, cwd) {
  const archivePath = `${binaryPath}.${type}`;

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

  archive.pipe(createWriteStream(archivePath));
  archive.file(binaryPath, { name: path.basename(binaryPath) });

  for (const include in includes) {
    archive.glob(include, { cwd });
  }

  archive.finalize();

  return {
    path: archivePath,
    extension: `.${type}`,
  };
}
