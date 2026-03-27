function dirname(filePath: string): string {
  const sep = filePath.includes('/') ? '/' : '\\';
  const idx = filePath.lastIndexOf(sep);
  return idx === -1 ? '.' : filePath.slice(0, idx);
}

function basenameNoExt(filePath: string): string {
  const sep = filePath.includes('/') ? '/' : '\\';
  const fileName = filePath.slice(filePath.lastIndexOf(sep) + 1);
  const dotIdx = fileName.lastIndexOf('.');
  return dotIdx === -1 ? fileName : fileName.slice(0, dotIdx);
}

function joinPath(dir: string, fileName: string): string {
  const sep = dir.includes('/') ? '/' : '\\';
  return dir + sep + fileName;
}

export function resolveOutputPath(
  sourcePath: string,
  targetFormat: string,
  existingPaths: string[],
  outputDir?: string,
): string {
  const dir = outputDir ?? dirname(sourcePath);
  const base = basenameNoExt(sourcePath);
  const ext = targetFormat.startsWith('.') ? targetFormat : '.' + targetFormat;

  const candidate = (name: string): string => joinPath(dir, name + ext);

  let resolved = candidate(base);
  if (!existingPaths.includes(resolved)) {
    return resolved;
  }

  let counter = 1;
  while (existingPaths.includes(candidate(`${base}-${counter}`))) {
    counter++;
  }
  return candidate(`${base}-${counter}`);
}

export function getOutputDir(sourcePath: string, customDir: string | null): string {
  return customDir ?? dirname(sourcePath);
}
