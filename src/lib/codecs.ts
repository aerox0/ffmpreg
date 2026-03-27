interface CodecMapping {
  video: string | null;
  audio: string | null;
}

const CONTAINER_CODEC_MAP: Record<string, CodecMapping> = {
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
};

export function getCodecForContainer(container: string): { video: string | null; audio: string | null } {
  return CONTAINER_CODEC_MAP[container] ?? { video: null, audio: null };
}
