import path from 'path';
import { spawnSync } from 'child_process';

import * as core from '@actions/core';

function exec(command, args, { capture, cwd, echo } = {}) {
  const options = {
    cwd, 
    encoding: 'utf8',
  };

  if (echo) {
    const dir = path.resolve(cwd ? cwd : process.cwd());
    core.info(`${dir}$ ${command} ${args.join(' ')}`)
  }

  if (!capture) {
    options.stdio = ['inherit', 'inherit', 'inherit'];
  }

  const result = spawnSync(command, args, options);
  
  if (result.error) {
    throw result.error;
  }

  if (echo && result.stdout) {
    core.info(result.stdout);
  }

  return result.stdout;
}

export function cargoMetadata(cwd = null) {
  return JSON.parse(exec('cargo', ['metadata'], { cwd, capture: true }));
}

export function rustcVersion() {
  const output = exec('rustc', ['--version', '--verbose'], { echo: true, capture: true });

  const lines = output.trim().split('\n');
  const info = {
    rustc: lines.shift(),
  };

  for(const line of lines) {
    let [key, val] = line.split(':', 2);
    info[key] = val.trim();
  }

  return info;
}

function packageBinaries(data) {
  return data.targets.filter(
    t => t.kind.some(kind => kind == 'bin')
  );
}

export function binaryInfo({ binary, pkg, cwd }) {
  const metadata = cargoMetadata(cwd);
  const packagesWithBinaries = metadata.packages.filter(
    p => packageBinaries(p).length > 0
  );

  // If neither a binary or package is specified and there is a single package,
  // try use the default specified.
  if (!binary && !pkg && packagesWithBinaries.length == 1) {
    binary = metadata.packages[0].default_run;
  }

  for (const packageData of packagesWithBinaries) {
    let binaryName = binary;

    // If a binary name isn't specified, use the package default if specified,
    // or the package name.
    if (!binaryName) {
      const defaultBinary = packageData.default_run;

      if (defaultBinary) {
        binaryName = defaultBinary;
      } else {
        binaryName = packageData.name;
      }
    }

    // If a package is specified, check the current iteration is that package.
    if (pkg && packageData.name != pkg) {
      continue
    }

    for (const targetData of packageBinaries(packageData)) {
      // Check the current iteration matches the binary name.
      if (targetData.name == binaryName) {
        return {
          metadata,
          package: packageData,
          'required-features': targetData['required-features'] || [],
          ...targetData,
        };
      }
    }
  }

  return null;
}

export function cargoBuild(binary, target, profile, features, cwd = null) {
  const args = [
    'build',
    '--bin', binary,
    '--target', target,
    '--profile', profile
  ];

  if (features.length > 0) {
    args.push('--features', features.join(','))
  }

  exec('cargo', args, { cwd, echo: true })
}
