// IPC channel constants — single source of truth for main, preload, and renderer

// File management
export const CHANNEL_FILES_ADD = 'files:add' as const;
export const CHANNEL_ITEM_REMOVE = 'item:remove' as const;
export const CHANNEL_QUEUE_CLEAR_DONE = 'queue:clearDone' as const;

// Item settings
export const CHANNEL_ITEM_UPDATE_SETTINGS = 'item:updateSettings' as const;

// Queue control
export const CHANNEL_QUEUE_START = 'queue:start' as const;
export const CHANNEL_ITEM_CANCEL = 'item:cancel' as const;
export const CHANNEL_QUEUE_CANCEL_ALL = 'queue:cancelAll' as const;
export const CHANNEL_ITEM_RETRY = 'item:retry' as const;

// Progress & status (main → renderer events)
export const CHANNEL_ENCODE_PROGRESS = 'encode:progress' as const;
export const CHANNEL_ENCODE_STATUS = 'encode:status' as const;

// Waveform
export const CHANNEL_FILE_WAVEFORM = 'file:waveform' as const;

// App settings
export const CHANNEL_SETTINGS_GET = 'settings:get' as const;
export const CHANNEL_SETTINGS_UPDATE = 'settings:update' as const;
