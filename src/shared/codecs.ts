/**
 * Codec mappings per container format.
 * Each container maps to a specific video and audio codec pair.
 */

export interface CodecPair {
  video: string | null;
  audio: string | null;
}

export const CODEC_MAP: Record<string, CodecPair> = {
  mp4: { video: 'libx264', audio: 'aac' },
  mov: { video: 'libx264', audio: 'aac' },
  mkv: { video: 'libx264', audio: 'aac' },
  webm: { video: 'libvpx-vp9', audio: 'libopus' },
  avi: { video: 'libx264', audio: 'libmp3lame' },
  gif: { video: 'gif', audio: null },
  mp3: { video: null, audio: 'libmp3lame' },
  aac: { video: null, audio: 'aac' },
  wav: { video: null, audio: 'pcm_s16le' },
  flac: { video: null, audio: 'flac' },
  ogg: { video: null, audio: 'libvorbis' },
  png: { video: null, audio: null },
  jpeg: { video: null, audio: null },
  webp: { video: null, audio: null },
};

export function getCodecForContainer(container: string): CodecPair {
  const lower = container.toLowerCase().replace('.', '');
  return CODEC_MAP[lower] || { video: null, audio: null };
}

export function isStreamCopyable(
  sourceVideoCodec: string | null,
  sourceAudioCodec: string | null,
  targetContainer: string
): boolean {
  const targetCodecs = getCodecForContainer(targetContainer);
  
  // For video, check if source codec matches target video codec
  if (sourceVideoCodec && targetCodecs.video) {
    // Normalize codec names for comparison
    const normalizedSource = normalizeCodec(sourceVideoCodec);
    const normalizedTarget = normalizeCodec(targetCodecs.video);
    if (normalizedSource !== normalizedTarget) {
      return false;
    }
  }
  
  // For audio, check if source codec matches target audio codec
  if (sourceAudioCodec && targetCodecs.audio) {
    const normalizedSource = normalizeCodec(sourceAudioCodec);
    const normalizedTarget = normalizeCodec(targetCodecs.audio);
    if (normalizedSource !== normalizedTarget) {
      return false;
    }
  }
  
  return true;
}

function normalizeCodec(codec: string): string {
  // Remove common prefixes and normalize
  return codec.toLowerCase().replace(/^avc1\./, 'h264').replace(/^hev1\./, 'hevc');
}
