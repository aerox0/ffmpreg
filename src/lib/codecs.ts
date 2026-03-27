// Container → codec mapping table from design spec
const CODEC_TABLE: Record<string, { video: string | null; audio: string | null }> = {
  mp4:  { video: 'libx264',   audio: 'aac' },
  mov:  { video: 'libx264',   audio: 'aac' },
  mkv:  { video: 'libx264',   audio: 'aac' },
  webm: { video: 'libvpx-vp9', audio: 'libopus' },
  avi:  { video: 'libx264',   audio: 'libmp3lame' },
  gif:  { video: null,        audio: null },
  mp3:  { video: null,        audio: 'libmp3lame' },
  aac:  { video: null,        audio: 'aac' },
  wav:  { video: null,        audio: 'pcm_s16le' },
  flac: { video: null,        audio: 'flac' },
  ogg:  { video: null,        audio: 'libvorbis' },
  // Image formats
  png:  { video: null,        audio: null },
  jpeg: { video: null,        audio: null },
  webp: { video: null,        audio: null },
};

export function getCodecForContainer(
  container: string,
): { video: string | null; audio: string | null } {
  const entry = CODEC_TABLE[container];
  if (!entry) {
    throw new Error(`Unknown container: ${container}`);
  }
  return entry;
}
