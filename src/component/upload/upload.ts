import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  InitResponse,
  UploadProgress,
  UploadService,
} from '../../service/uploadService/upload-service';

@Component({
  selector: 'app-upload',
  imports: [],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
})
export class Upload {
  private api = inject(UploadService);

  file: File | null = null;

  running = signal(false);
  percent = signal(0);
  statusText = signal('Idle');
  errorMessage = signal('');
  isDragging = signal(false);

  private paused = false;
  private uploadId: number | null = null;

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    if (selected) {
      this.handleFileSelected(selected);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.running()) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (this.running()) return;

    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) {
      this.handleFileSelected(dropped);
    }
  }

  private handleFileSelected(file: File) {
    this.file = file;
    this.percent.set(0);
    this.statusText.set('Ready to upload');
    this.errorMessage.set('');
  }

  clearSelectedFile() {
    if (this.running()) return;
    this.file = null;
    this.percent.set(0);
    this.statusText.set('Idle');
    this.uploadId = null;
    this.errorMessage.set('');
  }

  pause() {
    this.paused = true;
  }

  newSession() {
    if (this.file) localStorage.removeItem(this.key(this.file));
    this.file = null;
    this.uploadId = null;
    this.percent.set(0);
    this.statusText.set('Idle');
    this.errorMessage.set('');
    this.paused = false;
    this.running.set(false);
  }

  // Alias for backward compatibility
  reset() {
    this.newSession();
  }

  async cancelUpload() {
    if (!this.uploadId) return;
    try {
      await firstValueFrom(this.api.abort(this.uploadId));
      if (this.file) localStorage.removeItem(this.key(this.file));
      this.uploadId = null;
      this.percent.set(0);
      this.statusText.set('Aborted');
      this.running.set(false);
      this.paused = false;
    } catch (e: any) {
      this.errorMessage.set(e.error?.message ?? e.message ?? 'Failed to cancel upload');
    }
  }

  async start() {
    const file = this.file;
    if (!file) return;

    this.running.set(true);
    this.paused = false;
    this.errorMessage.set('');

    try {
      let progress = await this.resumeOrInit(file);
      if (!progress) return;

      const partSize = progress.partSize;
      let offset = progress.uploadedBytes;
      this.setProgress(offset, file.size);

      while (offset < file.size) {
        if (this.paused) {
          this.statusText.set('Paused');
          return;
        }
        const chunk = file.slice(offset, offset + partSize);
        progress = await this.sendChunkWithRetry(this.uploadId!, offset, chunk);
        offset = progress.uploadedBytes;
        this.setProgress(offset, file.size);
      }

      this.statusText.set('Finalizing...');
      const done = await firstValueFrom(this.api.complete(this.uploadId!));
      this.percent.set(100);
      this.statusText.set(done.status);
      localStorage.removeItem(this.key(file));
    } catch (e: any) {
      this.statusText.set('Failed');
      this.errorMessage.set(e.error?.message ?? e.message ?? 'Upload failed');
    } finally {
      this.running.set(false);
    }
  }

  private async resumeOrInit(file: File): Promise<UploadProgress | null> {
    const saved = localStorage.getItem(this.key(file));

    if (saved) {
      try {
        const p = await firstValueFrom(this.api.status(Number(saved)));

        if (p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED') {
          this.uploadId = p.id;
          return p;
        }
        if (p.status === 'COMPLETED') {
          this.statusText.set('COMPLETED');
          this.percent.set(100);
          localStorage.removeItem(this.key(file));
          return null;
        }
        localStorage.removeItem(this.key(file));
      } catch {
        localStorage.removeItem(this.key(file));
      }
    }

    const init = await firstValueFrom(
      this.api.init(file.name, file.type || 'application/octet-stream', file.size)
    );
    this.uploadId = init.id;
    localStorage.setItem(this.key(file), String(init.id));

    return {
      id: init.id,
      status: init.status,
      uploadedBytes: 0,
      totalBytes: file.size,
      partSize: init.partSize,
    };
  }

  private async sendChunkWithRetry(
    id: number,
    offset: number,
    chunk: Blob
  ): Promise<UploadProgress> {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await firstValueFrom(this.api.uploadChunk(id, offset, chunk));
        if (!res) {
          return await firstValueFrom(this.api.status(id));
        }
        return res;
      } catch (e: any) {
        if (e.status === 409) {
          return await firstValueFrom(this.api.status(id));
        }
        const retryable = e.status === 0 || e.status >= 500;
        if (!retryable || attempt === maxAttempts) throw e;

        const wait = 1000 * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw new Error('Upload connection failed');
  }

  private setProgress(offset: number, total: number) {
    const p = Math.floor((offset / total) * 100);
    this.percent.set(p);
    this.statusText.set(`Uploading (${p}%)`);
  }

  private key(file: File) {
    return `upload:${file.name}:${file.size}:${file.lastModified}`;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let i = -1;
    do {
      value /= 1024;
      i++;
    } while (value >= 1024 && i < units.length - 1);
    return value.toFixed(1) + ' ' + units[i];
  }
}
