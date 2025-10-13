import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { DocumentService, DocumentUploadResponse, UploadProgress } from '../../../api/client/document.service';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="max-w-5xl mx-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Nội dung chương</h1>
        <a class="px-4 py-2 border rounded hover:bg-gray-50 transition-colors flex items-center gap-2" [routerLink]="['/teacher/courses', courseId, 'sections']">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Quay lại chương
        </a>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="font-semibold mb-3">Danh sách bài học</div>
        <div class="p-6 text-gray-500" *ngIf="!loading() && lessons().length === 0">Chưa có bài học nào.</div>
        <div class="p-6 text-red-600" *ngIf="error()">{{ error() }}</div>

        <ul class="divide-y">
          <li *ngFor="let l of lessons()" class="py-3 flex items-center justify-between">
            <div class="pr-3">
              <div class="font-medium">{{ l.title }}</div>
            </div>
            <div class="inline-flex items-center gap-2">
              <button class="px-3 py-1 border rounded" *ngIf="l.videoUrl" (click)="viewLesson(l)">Xem</button>
              <button class="px-3 py-1 border rounded" (click)="startEdit(l)">Sửa</button>
              <button class="px-3 py-1 border rounded text-red-600" (click)="deleteLesson(l.id)">Xóa</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Video viewer -->
      <div class="bg-white rounded-lg shadow p-6 mt-6" *ngIf="selected() as s">
        <div class="flex items-center justify-between mb-3">
          <div class="font-semibold">Xem bài học: {{ s.title }}</div>
          <div class="inline-flex items-center gap-2">
            <button class="px-3 py-1 border rounded" (click)="closeViewer()">Đóng</button>
          </div>
        </div>
        <div class="text-sm text-gray-600 mb-3" *ngIf="s.description">{{ s.description }}</div>
        <ng-container *ngIf="s.videoUrl; else noVideoTpl">
          <div *ngIf="isYouTube(s.videoUrl); else nativeVideo">
            <div class="aspect-video w-full rounded overflow-hidden">
              <iframe class="w-full h-full" [src]="sanitizedEmbed()" frameborder="0" allowfullscreen></iframe>
            </div>
          </div>
          <ng-template #nativeVideo>
            <video class="w-full rounded" controls [src]="s.videoUrl"></video>
          </ng-template>
        </ng-container>
        <ng-template #noVideoTpl>
          <div class="text-gray-500">Bài học này chưa có video.</div>
        </ng-template>

        <!-- Lesson content displayed in viewer -->
        <div class="mt-4">
          <div class="font-semibold mb-1">Nội dung bài học</div>
          <div class="text-gray-800 whitespace-pre-line">{{ s.content || 'Chưa có nội dung.' }}</div>
        </div>
      </div>

      <!-- Create new lesson -->
      <div class="bg-white rounded-lg shadow p-6 mt-6">
        <div class="font-semibold mb-3">Thêm bài học mới</div>
        <form [formGroup]="createForm" class="space-y-4">
          <!-- Basic Info -->
          <div class="flex flex-wrap items-center gap-2">
            <input class="border rounded px-3 py-2 w-64" formControlName="title" placeholder="Tiêu đề" />
            <input class="border rounded px-3 py-2 w-64" formControlName="videoUrl" placeholder="URL video (tùy chọn)" />
            <input type="number" class="border rounded px-3 py-2 w-28" formControlName="durationMinutes" placeholder="Phút" />
          </div>

          <!-- Document Upload Section -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div class="text-sm font-medium text-gray-700 mb-2">Tải file Word (.doc/.docx) để tự động điền nội dung:</div>
            <div class="flex items-center gap-2">
              <input 
                type="file" 
                accept=".doc,.docx"
                (change)="onDocumentUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="text-xs text-gray-500 mt-1">Hỗ trợ: .doc, .docx (tối đa 10MB)</div>
            
            <!-- Upload Progress -->
            <div *ngIf="uploadProgress()" class="mt-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ uploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ uploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                     [style.width.%]="uploadProgress()?.progress"></div>
              </div>
            </div>
            
            <!-- Upload Success Message -->
            <div *ngIf="uploadSuccess()" class="mt-2 p-2 bg-green-100 text-green-700 rounded text-sm">
              ✅ Đã tải và xử lý file thành công: <strong>{{ uploadSuccess() }}</strong>
            </div>
          </div>

          <!-- Content Textarea -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung bài học:</label>
            <textarea 
              class="border rounded px-3 py-2 w-full min-h-[200px]" 
              formControlName="content" 
              placeholder="Nhập nội dung bài học hoặc tải file .doc/.docx ở trên để tự động điền...">
            </textarea>
          </div>

          <!-- Submit Button -->
          <div class="flex items-center gap-2">
            <button type="button" class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50" [disabled]="createForm.invalid || uploadProgress()" (click)="createLesson()">
              + Tạo bài học
            </button>
            <button type="button" class="px-4 py-2 border rounded" (click)="resetForm()">
              Xóa form
            </button>
          </div>
        </form>
        <div class="text-red-600 mt-2" *ngIf="opError()">{{ opError() }}</div>
      </div>

      <!-- Edit lesson modalish (simple inline) -->
      <div class="bg-white rounded-lg shadow p-6 mt-6" *ngIf="editingId() as id">
        <div class="font-semibold mb-3">Sửa bài học</div>
        <form [formGroup]="editForm" class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <input class="border rounded px-3 py-2 w-64" formControlName="title" placeholder="Tiêu đề" />
            <input class="border rounded px-3 py-2 w-64" formControlName="videoUrl" placeholder="URL video" />
            <input type="number" class="border rounded px-3 py-2 w-28" formControlName="durationMinutes" placeholder="Phút" />
          </div>

          <!-- Document Upload for Edit -->
          <div class="border border-gray-300 rounded-lg p-3 bg-gray-50">
            <div class="text-sm font-medium text-gray-700 mb-2">Tải file Word để thay thế nội dung:</div>
            <input 
              type="file" 
              accept=".doc,.docx"
              (change)="onDocumentUploadEdit($event)"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
            />
          </div>

          <textarea class="border rounded px-3 py-2 w-full min-h-[200px]" formControlName="content" placeholder="Nội dung bài học"></textarea>
          <div class="inline-flex items-center gap-2">
            <button type="button" class="px-3 py-1 border rounded" (click)="saveEdit(id)">Lưu</button>
            <button type="button" class="px-3 py-1 border rounded" (click)="cancelEdit()">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionEditorComponent {
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private documentService = inject(DocumentService);

  courseId: string = '';
  lessons = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  opError = signal<string>('');
  editingId = signal<string | null>(null);
  selected = signal<any | null>(null);
  private _sanitizedEmbed = signal<SafeResourceUrl | null>(null);

  // Document upload signals
  uploadProgress = signal<UploadProgress | null>(null);
  uploadSuccess = signal<string>('');

  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: [''],
    videoUrl: [''],
    durationMinutes: [0]
  });

  editForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: [''],
    videoUrl: [''],
    durationMinutes: [0]
  });

  constructor() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    // Resolve courseId to support back navigation
    this.courseId = this.route.snapshot.paramMap.get('id')
      || this.route.parent?.snapshot.paramMap.get('id')
      || this.route.parent?.parent?.snapshot.paramMap.get('id')
      || '';
    this.lessonApi.listBySection(sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách bài học'),
      complete: () => this.loading.set(false)
    });
  }

  createLesson() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    if (this.createForm.invalid) return;
    const payload: any = {
      title: this.createForm.value.title!,
      content: this.createForm.value.content || undefined,
      videoUrl: this.createForm.value.videoUrl || undefined,
      durationMinutes: this.createForm.value.durationMinutes ?? undefined
    };
    this.lessonApi.createLesson(sectionId, payload).subscribe({
      next: (res) => {
        const l = res?.data;
        if (l) this.lessons.update(list => [...list, l]);
        this.createForm.reset({ title: '', content: '', videoUrl: '', durationMinutes: 0 });
      },
      error: (err) => this.opError.set(err?.message || 'Tạo bài học thất bại')
    });
  }

  startEdit(l: any) {
    this.editingId.set(l.id);
    this.editForm.patchValue({ title: l.title || '', content: l.content || '', videoUrl: l.videoUrl || '', durationMinutes: l.durationMinutes || 0 });
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(id: string) {
    if (this.editForm.invalid) return;
    const payload: any = {
      title: this.editForm.value.title || undefined,
      content: this.editForm.value.content || undefined,
      videoUrl: this.editForm.value.videoUrl || undefined,
      durationMinutes: this.editForm.value.durationMinutes ?? undefined
    };
    this.lessonApi.updateLesson(id, payload).subscribe({
      next: () => {
        this.lessons.update(list => list.map(it => it.id === id ? { ...it, ...payload } : it));
        this.cancelEdit();
      },
      error: (err) => this.opError.set(err?.message || 'Cập nhật bài học thất bại')
    });
  }

  deleteLesson(id: string) {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    this.lessonApi.deleteLesson(id).subscribe({
      next: () => this.lessons.update(list => list.filter(i => i.id !== id)),
      error: (err) => this.opError.set(err?.message || 'Xóa bài học thất bại')
    });
  }

  // --- Viewer helpers ---
  viewLesson(l: any) {
    this.selected.set(l);
    const url: string = l?.videoUrl || '';
    if (this.isYouTube(url)) {
      const embed = this.toYouTubeEmbed(url);
      this._sanitizedEmbed.set(this.sanitizer.bypassSecurityTrustResourceUrl(embed));
    } else {
      this._sanitizedEmbed.set(null);
    }
  }

  closeViewer() {
    this.selected.set(null);
    this._sanitizedEmbed.set(null);
  }

  sanitizedEmbed() {
    return this._sanitizedEmbed();
  }

  isYouTube(url: string): boolean {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    } catch { return false; }
  }

  toYouTubeEmbed(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        // handle /shorts/ or /embed/
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'embed' || p === 'shorts' || p === 'watch');
        if (idx >= 0 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
      }
    } catch {}
    return url; // fallback
  }

  // --- Document Upload Methods ---
  onDocumentUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    this.processDocumentUpload(file, this.createForm);
  }

  onDocumentUploadEdit(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    this.processDocumentUpload(file, this.editForm);
  }

  private processDocumentUpload(file: File, targetForm: any) {
    // Reset states
    this.uploadProgress.set(null);
    this.uploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.documentService.validateFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Upload and process
    this.documentService.uploadDocument(file).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.uploadProgress.set(result as UploadProgress);
        } else {
          // Final result
          const response = result as DocumentUploadResponse;
          if (response.success) {
            // Update form content
            targetForm.patchValue({ 
              content: response.content 
            });
            this.uploadSuccess.set(response.filename);
            this.uploadProgress.set(null);
          } else {
            this.opError.set(response.message || 'Upload failed');
            this.uploadProgress.set(null);
          }
        }
      },
      error: (error) => {
        console.error('Document upload error:', error);
        this.opError.set(error?.error?.message || 'Có lỗi xảy ra khi tải file');
        this.uploadProgress.set(null);
      }
    });
  }

  resetForm() {
    this.createForm.reset();
    this.uploadSuccess.set('');
    this.uploadProgress.set(null);
    this.opError.set('');
  }
}
