import * as core from '@actions/core';
import * as github from '@actions/github';
import { single as format } from 'paraphrase';

import { build } from './lib/build.js';
import { uploadAsset } from './lib/upload.js';

// function archiveTarGzip(files, output) {
//   await tar.c(
//     {
//       gzip: true,
//       file: output,
//     },
//     files
//   )
// }

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

  core.startGroup('Build binary');
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

  // TODO: archive
  // for(const asset of output.assets) {
  //   let assetPath = asset.path;

  //   if (archiveTypes.length > 0) {
      
  //   } else {
  //     uploadAsset(octokit, github.context.repo, release, asset.path, asset.name, assetDigest)
  //   }
  // }

  core.startGroup('Upload release assets');
  await uploadAsset(octokit, github.context.repo, release, output, asset.name, asset.digest);
  core.endGroup();

} catch (error) {
  core.setFailed(error.message);
}
