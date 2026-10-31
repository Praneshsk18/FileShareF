import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FileItem, UploadService } from '../../service/uploadService/upload-service';

@Component({
  selector: 'app-files',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './files.html',
})
export class Files implements OnInit {
  private api = inject(UploadService);

  files = signal<FileItem[]>([]);
  loading = signal(false);
  error = signal('');
  downloadingId = signal<number | null>(null);

  // Pagination
  page = signal(0);
  pageSize = 20;
  totalElements = signal(0);
  totalPages = signal(0);
  isFirst = signal(true);
  isLast = signal(true);

  // Search
  search = '';

  // Delete confirmation
  deletingId = signal<number | null>(null);

  ngOnInit() {
    this.loadFiles();
  }

  async loadFiles() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await firstValueFrom(
        this.api.listFiles(this.page(), this.pageSize, this.search || undefined)
      );
      this.files.set(res.content);
      this.totalElements.set(res.totalElements);
      this.totalPages.set(res.totalPages);
      this.isFirst.set(res.first);
      this.isLast.set(res.last);
    } catch (e: any) {
      this.error.set(e.error?.message ?? e.message ?? 'Failed to load files');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch() {
    this.page.set(0);
    this.loadFiles();
  }

  clearSearch() {
    this.search = '';
    this.page.set(0);
    this.loadFiles();
  }

  prevPage() {
    if (!this.isFirst()) {
      this.page.update((p) => p - 1);
      this.loadFiles();
    }
  }

  nextPage() {
    if (!this.isLast()) {
      this.page.update((p) => p + 1);
      this.loadFiles();
    }
  }

  async download(file: FileItem) {
    this.downloadingId.set(file.id);
    try {
      const res = await firstValueFrom(this.api.getDownloadUrl(file.id));
      const a = document.createElement('a');
      a.href = res.downloadUrl;
      a.download = res.fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      this.error.set(e.error?.message ?? e.message ?? 'Download failed');
    } finally {
      this.downloadingId.set(null);
    }
  }

  confirmDelete(id: number) {
    this.deletingId.set(id);
  }

  cancelDelete() {
    this.deletingId.set(null);
  }

  async deleteFile(id: number) {
    this.deletingId.set(null);
    try {
      await firstValueFrom(this.api.deleteFile(id));
      this.files.update((list) => list.filter((f) => f.id !== id));
      this.totalElements.update((n) => Math.max(0, n - 1));
    } catch (e: any) {
      this.error.set(e.error?.message ?? e.message ?? 'Delete failed');
    }
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

  getFileBadge(fileName: string): { label: string; bg: string; text: string } {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return { label: ext.toUpperCase(), bg: 'bg-[#4F5B2A]/15 ring-1 ring-[#4F5B2A]/30', text: 'text-[#4F5B2A]' };
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      return { label: ext.toUpperCase(), bg: 'bg-[#B8892D]/15 ring-1 ring-[#B8892D]/40', text: 'text-[#B8892D]' };
    }
    if (['pdf'].includes(ext)) {
      return { label: 'PDF', bg: 'bg-[#D8C9A8]/50 ring-1 ring-[#D8C9A8]', text: 'text-[#4F5B2A]' };
    }
    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
      return { label: 'ZIP', bg: 'bg-[#B8892D]/20 ring-1 ring-[#B8892D]/40', text: 'text-[#B8892D]' };
    }
    if (['js', 'ts', 'html', 'css', 'json', 'java', 'py'].includes(ext)) {
      return { label: ext.toUpperCase(), bg: 'bg-[#4F5B2A]/10 ring-1 ring-[#4F5B2A]/20', text: 'text-[#4F5B2A]' };
    }
    return { label: ext ? ext.toUpperCase() : 'FILE', bg: 'bg-[#D8C9A8]/40 ring-1 ring-[#D8C9A8]', text: 'text-[#4F5B2A]' };
  }
}
