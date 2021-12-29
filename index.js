import * as core from '@actions/core';
import * as github from '@actions/github';
import { single as format } from 'paraphrase';

import { build } from './lib/build.js';
import { archiveAssets, validateTypes } from './lib/archive.js';
import { uploadAsset } from './lib/upload.js';

function getInputs() {
  const inputs = {
    pkg: core.getInput('pkg'),
    target: core.getInput('target'),
    binary: core.getInput('binary'),
    profile: core.getInput('profile'),
    githubToken: core.getInput('token'),
    assetName: core.getInput('asset'),
    assetFormat: core.getInput('asset_format'),
    assetDigest: core.getBooleanInput('asset_digest'),
    archive: core.getBooleanInput('archive'),
    archiveTypes: [],
    archiveInclude: core.getMultilineInput('archive_include'),
  };

  const archiveTypes = core.getInput('archive_types');
  if (archiveTypes) {
    inputs.archiveTypes = archiveTypes.split(',');
    validateTypes(inputs.archiveTypes);
  }

  return inputs;
}

try {
  const inputs = getInputs();

  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#release
  const repo = github.context.repo;
  const release = github.context.payload['release'];

  // Only run if a draft is saved, or a release or pre-release is published
  // without previously being saved as a draft.
  if (github.context.payload.action != 'created' || !release) {
    throw new Error('Requires a created release context');
  }

  core.startGroup('Build binary');
  const { binary, binaryPath, binaryExtension, profile, target, isWindowsTarget } = build({
    pkg: inputs.pkg,
    binary: inputs.binary,
    profile: inputs.profile,
    target: inputs.target,
    cwd: null
  });
  core.endGroup();

  const { archive, archiveInclude, archiveTypes } = inputs;
  const octokit = github.getOctokit(inputs.githubToken);
  const assetFormatArgs = {
    repo,
    binary,
    target,
    release,
    profile,
  };

  const assets = [];

  if (archive) {
    core.startGroup('Archive release assets');

    if (archiveTypes.length == 0) {
      if (isWindowsTarget) {
        archiveTypes.push('zip');
      } else {
        archiveTypes.push('tar.gz');
      }
    }

    for (const type of archiveTypes) {
      assets.push(await archiveAssets(type, binaryPath, archiveInclude));
    }

    core.endGroup();
  } else {
    assets.push({
      path: binaryPath,
      extension: binaryExtension,
    });
  }

  core.startGroup('Upload release assets');
  for (const asset of assets) {
    if (inputs.assetName) {
      asset.name = `${inputs.assetName}${asset.extension}`;
    } else if (inputs.assetFormat) {
      asset.name = format(inputs.assetFormat, {
        ...assetFormatArgs,
        extension: asset.extension
      });
    } else {
      asset.name = `${binary.name}${asset.extension}`;
    }

    await uploadAsset(octokit, repo, release, asset.path, asset.name, inputs.assetDigest);
  }
  core.endGroup();

} catch (error) {
  core.setFailed(error.message);
}
