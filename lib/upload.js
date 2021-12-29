import { createHash } from 'crypto';
import { readFileSync } from 'fs';

import * as core from '@actions/core';

export async function uploadAsset(octokit, repo, release, path, name, digest) {
  const data = readFileSync(path);

  core.info(`uploading release asset ${path} as ${name}`)

  await octokit.rest.repos.uploadReleaseAsset({
    data,
    name,
    repo: repo.repo,
    owner: repo.owner,
    release_id: release.id,
  });

  if (digest) {
    const digest = createHash('sha256').update(data).digest('hex');
    const digestData = `${digest}  ${name}\n`;
    const digestName = `${name}.sha256`;

    core.info(`uploading release asset SHA256 ${path} ${digest}`)

    await octokit.rest.repos.uploadReleaseAsset({
      data: digestData,
      name: digestName,
      repo: repo.repo,
      owner: repo.owner,
      release_id: release.id,
    });
  }
}
