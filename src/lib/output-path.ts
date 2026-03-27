import path from 'node:path';

export function resolveOutputPath(
  sourcePath: string,
  targetFormat: string,
  existingPaths: string[],
  outputDir?: string,
): string {
  const dir = outputDir ?? path.dirname(sourcePath);
  const basename = path.basename(sourcePath, path.extname(sourcePath));
  const ext = targetFormat.startsWith('.') ? targetFormat : '.' + targetFormat;

  const candidate = (name: string): string => path.resolve(dir, name + ext);

  let resolved = candidate(basename);
  if (!existingPaths.includes(resolved)) {
    return resolved;
  }

  let counter = 1;
  while (existingPaths.includes(candidate(`${basename}-${counter}`))) {
    counter++;
  }
  return candidate(`${basename}-${counter}`);
}

export function getOutputDir(sourcePath: string, customDir: string | null): string {
  return customDir ?? path.dirname(sourcePath);
}
