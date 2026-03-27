function dirname(p: string): string {
  const lastSlash = p.lastIndexOf('/');
  if (lastSlash === -1) {
    const lastBackslash = p.lastIndexOf('\\');
    if (lastBackslash === -1) return '.';
    return p.slice(0, lastBackslash);
  }
  return p.slice(0, lastSlash);
}

function extname(p: string): string {
  const lastDot = p.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return p.slice(lastDot);
}

function basename(p: string): string {
  const lastSlash = p.lastIndexOf('/');
  const name = lastSlash === -1 ? p : p.slice(lastSlash + 1);
  const ext = extname(name);
  if (ext) return name.slice(0, -ext.length);
  return name;
}

function join(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

export function getOutputDir(sourcePath: string, customDir: string | null): string {
  return customDir ?? dirname(sourcePath);
}

export function resolveOutputPath(
  sourcePath: string,
  targetFormat: string,
  existingPaths: string[],
  outputDir?: string | null,
): string {
  const dir = (outputDir ?? dirname(sourcePath)) || '.';
  const baseName = basename(sourcePath);
  let candidate = join(dir, `${baseName}.${targetFormat}`);

  // If no conflict, return immediately
  if (!existingPaths.includes(candidate)) {
    return candidate;
  }

  // Find the next available suffix
  let suffix = 1;
  while (existingPaths.includes(candidate)) {
    candidate = join(dir, `${baseName}-${suffix}.${targetFormat}`);
    suffix++;
  }

  return candidate;
}
