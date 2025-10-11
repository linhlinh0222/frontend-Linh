import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DocumentUploadResponse {
  success: boolean;
  content: string;
  filename: string;
  message: string;
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/documents`;

  /**
   * Upload and parse document file (.doc/.docx)
   * @param file Document file to upload
   * @returns Observable with upload progress and final result
   */
  uploadDocument(file: File): Observable<DocumentUploadResponse | UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<DocumentUploadResponse>(`${this.baseUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            return {
              progress,
              status: 'uploading' as const,
              message: `Uploading... ${progress}%`
            } as UploadProgress;

          case HttpEventType.Response:
            if (event.body) {
              return event.body as DocumentUploadResponse;
            }
            throw new Error('No response body');

          default:
            return {
              progress: 0,
              status: 'processing' as const,
              message: 'Processing document...'
            } as UploadProgress;
        }
      })
    );
  }

  /**
   * Get supported file formats and limits
   */
  getSupportedFormats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/supported-formats`);
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Check file extension
    const allowedExtensions = ['.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        isValid: false,
        error: 'Only .doc and .docx files are supported'
      };
    }

    return { isValid: true };
  }
}