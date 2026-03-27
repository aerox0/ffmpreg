export const CHANNELS = {
  // Queue management
  QUEUE_ADD_FILES: 'queue:add-files',
  QUEUE_REMOVE: 'queue:remove',
  QUEUE_CLEAR_DONE: 'queue:clear-done',
  QUEUE_UPDATE_SETTINGS: 'queue:update-settings',
  QUEUE_START: 'queue:start',
  QUEUE_CANCEL: 'queue:cancel',
  QUEUE_CANCEL_ALL: 'queue:cancel-all',
  QUEUE_RETRY: 'queue:retry',

  // Encoding events (renderer listens)
  ENCODE_PROGRESS: 'encode:progress',
  ENCODE_STATUS: 'encode:status',

  // File operations
  FILE_WAVEFORM: 'file:waveform',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
} as const;

export type Channel = typeof CHANNELS[keyof typeof CHANNELS];
