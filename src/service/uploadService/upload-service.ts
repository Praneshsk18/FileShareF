import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../environments/environment';

@Service()
export class UploadService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/upload`;

  // ── Upload Session ──

  init(fileName: string, contentType: string, fileSize: number) {
    return this.http.post<InitResponse>(`${this.base}/init`, { fileName, contentType, fileSize });
  }

  status(id: number) {
    return this.http.get<UploadProgress>(`${this.base}/${id}`);
  }

  abort(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Server-Proxied Chunk Uploads ──

  uploadChunk(id: number, offset: number, chunk: Blob) {
    const headers = new HttpHeaders({
      'Upload-Offset': String(offset),
      'Content-Type': 'application/octet-stream',
    });
    return this.http.put<UploadProgress>(`${this.base}/chunk/${id}`, chunk, { headers });
  }

  complete(id: number) {
    return this.http.post<CompleteResponse>(`${this.base}/${id}/complete`, null);
  }

  // ── File Catalog ──

  listFiles(page = 0, size = 20, search?: string) {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (search) params = params.set('search', search);
    return this.http.get<PageResponse<FileItem>>(`${this.base}/files/db`, { params });
  }

  getDownloadUrl(fileId: number, expiryMinutes = 15) {
    const params = new HttpParams().set('expiryMinutes', expiryMinutes);
    return this.http.get<DownloadResponse>(`${this.base}/files/${fileId}/download`, { params });
  }

  deleteFile(fileId: number) {
    return this.http.delete<DeleteResponse>(`${this.base}/files/${fileId}`);
  }
}

// ── Interfaces ──

export interface InitResponse {
  id: number;
  partSize: number;
  totalParts: number;
  status: string;
}

export interface UploadProgress {
  id: number;
  status: string;
  uploadedBytes: number;
  totalBytes: number;
  partSize: number;
}

export interface CompleteResponse {
  id: number;
  status: string;
  totalBytes: number;
}

export interface FileItem {
  id: number;
  fileName: string;
  storageKey: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: string;
}

export interface DownloadResponse {
  key: string;
  fileName: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface DeleteResponse {
  message: string;
  id: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}
