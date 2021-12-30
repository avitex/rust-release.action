import { binaryInfo, rustcVersion, cargoBuild } from './rust.js';

export function build({ pkg, binary, profile, target, cwd }) {
  binary = binaryInfo({ pkg, binary, cwd })

  if (!profile) {
    profile = 'release';
  }
  if (binary == null) {
    throw new Error(`binary not found (supplied binary: "${binary}", pkg: "${pkg}"`);
  }

  target = target || rustcVersion()['host'];

  const isWindowsTarget = target.includes('windows');
  const binaryExtension = isWindowsTarget ? '.exe' : '';
  const binaryPath = `${binary.metadata.target_directory}/${target}/${profile}/${binary.name}${binaryExtension}`;

  const features = binary['required-features'];

  cargoBuild(binary.name, target, profile, features, cwd);

  return {
    binary,
    binaryPath,
    binaryExtension,
    target,
    profile,
    features,
    isWindowsTarget,
  };
}
