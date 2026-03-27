import type { Toast } from '../../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  exiting: Set<string>;
  onDismiss: (id: string) => void;
  onOpenFolder: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function TypeIcon({ type }: { type: Toast['inputType'] }) {
  const color = 'currentColor';
  if (type === 'video') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/>
    </svg>
  );
  if (type === 'audio') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
  );
}

export function ToastContainer({ toasts, exiting, onDismiss, onOpenFolder }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.status} ${exiting.has(toast.id) ? 'exiting' : 'entering'}`}
        >
          <div className="toast-icon">
            <TypeIcon type={toast.inputType} />
          </div>
          <div className="toast-content">
            <div className="toast-filename" title={toast.fileName}>
              {toast.fileName.length > 28 ? toast.fileName.slice(0, 28) + '…' : toast.fileName}
            </div>
            <div className="toast-meta">
              <span className={`toast-status ${toast.status}`}>
                {toast.status === 'done' ? 'Done' : 'Failed'}
              </span>
              {toast.status === 'done' && toast.outputSize != null && (
                <span className="toast-size">
                  {toast.sourceSize && toast.sourceSize > 0
                    ? `${Math.round((1 - toast.outputSize / toast.sourceSize) * 100)}% smaller`
                    : formatBytes(toast.outputSize)}
                </span>
              )}
            </div>
          </div>
          {toast.status === 'done' && (
            <button className="toast-open" onClick={onOpenFolder} title="Open output folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          )}
          <button className="toast-dismiss" onClick={() => onDismiss(toast.id)} title="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
