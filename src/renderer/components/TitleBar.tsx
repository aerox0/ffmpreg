import { useEffect, useState } from 'react';
import styles from './TitleBar.module.css';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Get initial maximized state
    window.electronAPI.isMaximized().then(setIsMaximized);

    // Listen for maximize changes
    const cleanup = window.electronAPI.onMaximizeChange((maximized) => {
      setIsMaximized(maximized);
    });

    return cleanup;
  }, []);

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className={styles.titlebar}>
      <div className={styles.dragRegion}>
        <div className={styles.brand}>
          <span className={styles.logo}>◈</span>
          <span className={styles.title}>ffmpreg</span>
        </div>
      </div>
      <div className={styles.controls}>
        <button 
          className={styles.controlButton} 
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="5.5" width="8" height="1" fill="currentColor"/>
          </svg>
        </button>
        <button 
          className={styles.controlButton} 
          onClick={handleMaximize}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none"/>
              <rect x="1" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="var(--bg-secondary)"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </button>
        <button 
          className={`${styles.controlButton} ${styles.closeButton}`} 
          onClick={handleClose}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
