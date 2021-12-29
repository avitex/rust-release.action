import { binaryInfo, rustcVersion, cargoBuild } from './rust.js';

export function build({ pkg, binary, profile, target, cwd }) {
    binary = binaryInfo({ pkg, binary, cwd })

    if (!profile) {
        profile = 'release';
    }
    if (binary == null) {
        return null;
    }

    target = target || rustcVersion()['host'];

    const isWindows = target.includes('windows');
    const extension = isWindows ? '.exe' : '';
    const output = `${binary.metadata.target_directory}/${target}/${profile}/${binary.name}${extension}`;

    const features = binary['required-features'];

    cargoBuild(binary.name, target, profile, features, cwd);

    return {
        output,
        binary,
        target,
        profile,
        features,
        extension,
    };
}
