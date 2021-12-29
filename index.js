import { createHash } from 'crypto';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { single as format } from 'paraphrase';

import { build } from './build.js';

// function archiveTarGzip(files, output) {
//   await tar.c(
//     {
//       gzip: true,
//       file: output,
//     },
//     files
//   )
// }

async function uploadAsset(octokit, repo, release, path, name, digest) {
  const data = fs.readFileSync(path);

  await octokit.rest.repos.uploadReleaseAsset({
    data, 
    name,
    repo: repo.repo,
    owner: repo.owner,
    release_id: release.id,
  });

  if (digest) {
    const digest = createHash('sha256').update(path).digest('hex');
    const digestData = `${digest}  ${name}\n`;
    const digestName = `${name}.sha256`;

    await octokit.rest.repos.uploadReleaseAsset({
      data: digestData, 
      name: digestName,
      repo: repo.repo,
      owner: repo.owner,
      release_id: release.id,
    });
  }
}

function getArchiveInput() {
  const types = core.getInput('archive');
  const include = core.getMultilineInput('archive_include');
  const options = {};

  if (types != '') {
    options.types = types.split(',');
  }
  if (include != '') {
    options.include = include.split('\n');
  }
  
  return options;
}

function getAssetInput() {
  const name = core.getInput('asset');
  const format = core.getInput('asset_format');
  const digest = core.getBooleanInput('asset_digest');
  const options = { digest };

  if (name != '') {
    options.name = name;
  }
  if (format != '') {
    options.format = format;
  }

  return options;
}

function getInputs() {
  const asset = getAssetInput();
  const archive = getArchiveInput();
  const pkg = core.getInput('pkg');
  const target = core.getInput('target');
  const binary = core.getInput('binary');
  const profile = core.getInput('profile');
  const githubToken = core.getInput('token');

  return {
    pkg,
    asset,
    archive,
    target,
    binary,
    profile,
    githubToken,
  };
}

try {
  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#release
  const repo = github.context.repo;
  const release = github.context.payload['release'];
  const inputs = getInputs();

  // Only run if a draft is saved, or a release or pre-release is published
  // without previously being saved as a draft.
  if (github.context.payload.action != 'created' || release == undefined) {
    process.exit(0);
  }
  
  const octokit = github.getOctokit(inputs.githubToken);

  core.startGroup('build');
  const { output, binary, profile, target, extension } = build({
    pkg: inputs.pkg,
    binary: inputs.binary,
    profile: inputs.profile,
    target: inputs.target,
    cwd: null
  });
  core.endGroup();

  const asset = inputs.asset;

  if (!asset.name) {
    if (asset.format) {
        const formatArgs = {
            repo,
            asset,
            binary,
            target,
            release,
            profile,
            extension,
        };
        asset.name = format(asset.format, formatArgs);
    } else {
        asset.name = binary.name;
    }
  }

  core.startGroup('upload');
  uploadAsset(octokit, github.context.repo, release, output, asset.name, asset.digest);
  core.endGroup();

  // TODO: archive
  // for(const asset of output.assets) {
  //   let assetPath = asset.path;

  //   if (archiveTypes.length > 0) {
      
  //   } else {
  //     uploadAsset(octokit, github.context.repo, release, asset.path, asset.name, assetDigest)
  //   }
  // }
} catch (error) {
  core.setFailed(error.message);
}
