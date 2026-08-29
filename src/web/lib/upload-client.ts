/**
 * Client-Side Upload Utility with Real-Time Progress, Speed & ETA Tracking
 */

export interface UploadProgressState {
  progress: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  formattedSpeed: string;
  formattedEta: string;
  formattedLoaded: string;
  formattedTotal: string;
  fileName: string;
  fileType: 'image' | 'video' | 'archive' | 'file';
  stage: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error' | 'aborted';
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || !isFinite(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '0 KB/s';
  return `${formatFileSize(bytesPerSec)}/s`;
}

export function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds) || seconds > 86400) return 'Calculating...';
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s remaining`;
}

export function getFileCategory(file: File): 'image' | 'video' | 'archive' | 'file' {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type.startsWith('video/') || /\.(mp4|webm|mov|ogg|ogv|mkv|m4v)$/i.test(name)) {
    return 'video';
  }
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) {
    return 'image';
  }
  if (/\.(zip|rar|7z|tar|bz2|gz)$/i.test(name)) {
    return 'archive';
  }
  return 'file';
}

export function uploadSocialFileWithProgress(
  file: File,
  endpoint: string = '/api/upload/social',
  onProgress?: (state: UploadProgressState) => void
): { promise: Promise<{ url: string }>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  let startTime = Date.now();
  let lastLoaded = 0;
  let lastTime = Date.now();
  let isCancelled = false;

  const fileCategory = getFileCategory(file);

  const initialStats: UploadProgressState = {
    progress: 0,
    loadedBytes: 0,
    totalBytes: file.size,
    speedBytesPerSec: 0,
    formattedSpeed: '0 KB/s',
    formattedEta: 'Calculating...',
    formattedLoaded: '0 MB',
    formattedTotal: formatFileSize(file.size),
    fileName: file.name,
    fileType: fileCategory,
    stage: 'preparing',
  };

  onProgress?.(initialStats);

  const cancel = () => {
    isCancelled = true;
    xhr.abort();
    onProgress?.({
      ...initialStats,
      stage: 'aborted',
      error: 'Upload cancelled by user',
    });
  };

  const promise = new Promise<{ url: string }>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || isCancelled) return;

      const now = Date.now();
      const timeDelta = (now - lastTime) / 1000;
      const loadedDelta = e.loaded - lastLoaded;

      let speed = 0;
      if (timeDelta > 0.1) {
        speed = loadedDelta / timeDelta;
        lastLoaded = e.loaded;
        lastTime = now;
      } else {
        const totalElapsed = (now - startTime) / 1000;
        speed = totalElapsed > 0 ? e.loaded / totalElapsed : 0;
      }

      const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
      const remainingBytes = e.total - e.loaded;
      const etaSeconds = speed > 0 ? remainingBytes / speed : 0;

      const isDoneUploading = e.loaded >= e.total;

      onProgress?.({
        progress: percent,
        loadedBytes: e.loaded,
        totalBytes: e.total,
        speedBytesPerSec: speed,
        formattedSpeed: formatSpeed(speed),
        formattedEta: isDoneUploading ? 'Processing on server...' : formatEta(etaSeconds),
        formattedLoaded: formatFileSize(e.loaded),
        formattedTotal: formatFileSize(e.total),
        fileName: file.name,
        fileType: fileCategory,
        stage: isDoneUploading ? 'processing' : 'uploading',
      });
    };

    xhr.onload = () => {
      if (isCancelled) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            onProgress?.({
              progress: 100,
              loadedBytes: file.size,
              totalBytes: file.size,
              speedBytesPerSec: 0,
              formattedSpeed: 'Complete',
              formattedEta: 'Done',
              formattedLoaded: formatFileSize(file.size),
              formattedTotal: formatFileSize(file.size),
              fileName: file.name,
              fileType: fileCategory,
              stage: 'completed',
            });
            resolve(data);
          } else {
            const err = data.message || 'Server did not return a valid media URL.';
            onProgress?.({
              progress: 0,
              loadedBytes: 0,
              totalBytes: file.size,
              speedBytesPerSec: 0,
              formattedSpeed: 'Failed',
              formattedEta: '',
              formattedLoaded: '0 MB',
              formattedTotal: formatFileSize(file.size),
              fileName: file.name,
              fileType: fileCategory,
              stage: 'error',
              error: err,
            });
            reject(new Error(err));
          }
        } catch (e: any) {
          const err = 'Invalid server response JSON: ' + (e?.message || 'Parse error');
          reject(new Error(err));
        }
      } else {
        let errorMsg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const resJson = JSON.parse(xhr.responseText);
          if (resJson.message) errorMsg = resJson.message;
        } catch {}
        onProgress?.({
          progress: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          speedBytesPerSec: 0,
          formattedSpeed: 'Failed',
          formattedEta: '',
          formattedLoaded: '0 MB',
          formattedTotal: formatFileSize(file.size),
          fileName: file.name,
          fileType: fileCategory,
          stage: 'error',
          error: errorMsg,
        });
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      if (isCancelled) return;
      const errorMsg = 'Network error during media upload. Check your connection.';
      onProgress?.({
        progress: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        speedBytesPerSec: 0,
        formattedSpeed: 'Failed',
        formattedEta: '',
        formattedLoaded: '0 MB',
        formattedTotal: formatFileSize(file.size),
        fileName: file.name,
        fileType: fileCategory,
        stage: 'error',
        error: errorMsg,
      });
      reject(new Error(errorMsg));
    };

    xhr.ontimeout = () => {
      if (isCancelled) return;
      const errorMsg = 'Upload timed out. Try uploading a smaller file or checking internet speed.';
      onProgress?.({
        progress: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        speedBytesPerSec: 0,
        formattedSpeed: 'Timed out',
        formattedEta: '',
        formattedLoaded: '0 MB',
        formattedTotal: formatFileSize(file.size),
        fileName: file.name,
        fileType: fileCategory,
        stage: 'error',
        error: errorMsg,
      });
      reject(new Error(errorMsg));
    };

    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', endpoint, true);
    xhr.timeout = 600000; // 10 minutes timeout for high-res video uploads
    xhr.send(formData);
  });

  return { promise, cancel };
}
