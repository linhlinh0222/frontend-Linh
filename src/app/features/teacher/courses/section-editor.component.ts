import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { DocumentService, DocumentUploadResponse, UploadProgress } from '../../../api/client/document.service';
import { LessonAttachmentApi } from '../../../api/client/lesson-attachment.api';

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
              <button class="px-3 py-1 border rounded" (click)="viewLesson(l)">Xem</button>
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
        
        <!-- Video Section - Only show if video URL exists and is valid -->
        <div *ngIf="hasValidVideoUrl(s)" class="mb-4">
          <div class="font-semibold mb-2">Video bài học</div>
          <ng-container *ngIf="s.videoUrl">
            <div *ngIf="isYouTube(s.videoUrl); else nativeVideo">
              <div class="aspect-video w-full rounded overflow-hidden">
                <iframe class="w-full h-full" [src]="sanitizedEmbed()" frameborder="0" allowfullscreen></iframe>
              </div>
            </div>
            <ng-template #nativeVideo>
              <video class="w-full rounded" controls [src]="s.videoUrl"></video>
            </ng-template>
          </ng-container>
        </div>

        <!-- Lesson content displayed in viewer -->
        <div class="mt-4">
          <div class="font-semibold mb-1">Nội dung bài học</div>
          <div class="text-gray-800 whitespace-pre-line">{{ s.content || 'Chưa có nội dung.' }}</div>
        </div>

        <!-- Lesson attachments with direct viewing -->
        <div class="mt-4" *ngIf="s.attachments && s.attachments.length > 0">
          <div class="font-semibold mb-2">Tài liệu bài học ({{ s.attachments.length }})</div>
          <div class="space-y-3">
            <div *ngFor="let attachment of s.attachments; let i = index" class="border rounded-lg overflow-hidden">
              <!-- Attachment Header -->
              <div class="flex items-center justify-between bg-gray-50 p-3 border-b">
                <div class="flex items-center gap-3">
                  <div class="text-xs px-2 py-1 rounded font-medium" 
                       [class]="getFileTypeClass(attachment.originalFileName)">
                    {{ getFileExtension(attachment.originalFileName) }}
                  </div>
                  <div>
                    <div class="font-medium text-sm">{{ attachment.originalFileName }}</div>
                    <div class="text-xs text-gray-500">{{ formatFileSize(attachment.fileSize) }} • {{ attachment.fileType }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button *ngIf="isPresentationFile(attachment.originalFileName)" 
                          (click)="toggleAttachmentViewer(i)"
                          class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    {{ expandedAttachment === i ? 'Thu gọn' : 'Xem slide' }}
                  </button>
                  <button *ngIf="isPdfFile(attachment.originalFileName)" 
                          (click)="toggleAttachmentViewer(i)"
                          class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    {{ expandedAttachment === i ? 'Thu gọn' : 'Xem PDF' }}
                  </button>
                  <a [href]="attachment.fileUrl" target="_blank" 
                     class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    Tải về
                  </a>
                  <button class="px-3 py-1 border text-sm rounded hover:bg-gray-50" 
                          (click)="removeAttachmentFromLesson(s.id, attachment.id)">
                    Xóa
                  </button>
                </div>
              </div>
              
              <!-- Inline File Viewer -->
              <div *ngIf="expandedAttachment === i" class="p-4 bg-white">
                <!-- PDF Viewer -->
                <div *ngIf="isPdfFile(attachment.originalFileName)" class="w-full">
                  <iframe [src]="getSafeUrl(attachment.fileUrl)"
                          class="w-full border-0 rounded"
                          style="height: 600px;"
                          frameborder="0">
                    <p>Trình duyệt không hỗ trợ xem PDF. <a [href]="attachment.fileUrl" target="_blank">Tải về để xem</a></p>
                  </iframe>
                  <!-- PDF Preview Controls -->
                  <div class="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div class="text-sm text-gray-600">
                      <span class="font-medium">Xem trước PDF:</span> {{ attachment.originalFileName }}
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              (click)="openPdfFullscreen(attachment)">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                        </svg>
                        Phóng to
                      </button>
                      <a [href]="attachment.fileUrl" target="_blank"
                         class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Tải về
                      </a>
                    </div>
                  </div>
                </div>
                
                <!-- Office Document Viewer (using Office Online) -->
                <div *ngIf="isOfficeFile(attachment.originalFileName)" class="w-full">
                  <iframe [src]="getOfficeViewerUrl(attachment.fileUrl)" 
                          class="w-full border-0 rounded"
                          style="height: 600px;"
                          frameborder="0">
                    <p>Không thể hiển thị file. <a [href]="attachment.fileUrl" target="_blank">Tải về để xem</a></p>
                  </iframe>
                </div>
                
                <!-- Image Viewer -->
                <div *ngIf="isImageFile(attachment.originalFileName)" class="text-center">
                  <img [src]="attachment.fileUrl" [alt]="attachment.originalFileName" 
                       class="max-w-full h-auto rounded border">
                </div>
                
                <!-- Video Player -->
                <div *ngIf="isVideoFile(attachment.originalFileName)" class="w-full">
                  <video controls class="w-full rounded">
                    <source [src]="attachment.fileUrl" [type]="getVideoMimeType(attachment.originalFileName)">
                    Trình duyệt không hỗ trợ video này.
                  </video>
                </div>
                
                <!-- Audio Player -->
                <div *ngIf="isAudioFile(attachment.originalFileName)" class="w-full">
                  <audio controls class="w-full">
                    <source [src]="attachment.fileUrl" [type]="getAudioMimeType(attachment.originalFileName)">
                    Trình duyệt không hỗ trợ audio này.
                  </audio>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PDF Fullscreen Viewer Modal -->
      <div *ngIf="pdfFullscreenAttachment" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" (click)="closePdfFullscreen()">
        <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-4 border-b bg-gray-50">
            <div class="flex items-center gap-3">
              <div class="text-red-600">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ pdfFullscreenAttachment.originalFileName }}</h3>
                <p class="text-sm text-gray-600">{{ formatFileSize(pdfFullscreenAttachment.fileSize) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a [href]="pdfFullscreenAttachment.fileUrl" target="_blank"
                 class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Tải về
              </a>
              <button (click)="closePdfFullscreen()"
                      class="px-3 py-1 border text-sm rounded hover:bg-gray-50 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Đóng
              </button>
            </div>
          </div>

          <!-- PDF Viewer -->
          <div class="p-4">
            <iframe [src]="getSafeUrl(pdfFullscreenAttachment.fileUrl)"
                    class="w-full border-0 rounded"
                    style="height: 70vh;"
                    frameborder="0">
              <p class="text-center text-gray-500 py-8">
                Trình duyệt không hỗ trợ xem PDF.
                <a [href]="pdfFullscreenAttachment.fileUrl" target="_blank" class="text-blue-600 underline ml-2">
                  Tải về để xem
                </a>
              </p>
            </iframe>
          </div>
        </div>
      </div>

      <!-- Button to show/hide create lesson form -->
      <div class="bg-white rounded-lg shadow p-4 mt-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Quản lý bài học</h2>
          <button 
            (click)="toggleCreateForm()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path *ngIf="!showCreateForm()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              <path *ngIf="showCreateForm()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            {{ showCreateForm() ? 'Đóng form' : 'Thêm bài học mới' }}
          </button>
        </div>
      </div>

      <!-- Create new lesson form (collapsible) -->
      <div class="bg-white rounded-lg shadow p-6 mt-4" *ngIf="showCreateForm()">
        <div class="font-semibold mb-3">Thêm bài học mới</div>
        <form [formGroup]="createForm" class="space-y-4">
          <!-- Basic Info -->
          <div class="flex flex-wrap items-center gap-2">
            <input class="border rounded px-3 py-2 w-64" formControlName="title" placeholder="Tiêu đề" />
            <input class="border rounded px-3 py-2 w-64" formControlName="videoUrl" placeholder="URL video (tùy chọn)" />
          </div>

          <!-- File Attachments Section -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div class="text-sm font-medium text-gray-700 mb-2">File đính kèm (PDF, Word, Excel, PowerPoint, Video, Audio):</div>
            <div class="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.mp3,.wav"
                multiple
                (change)="onFileAttachmentsUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="text-xs text-gray-500 mt-1">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV (tối đa 100MB/file)</div>

            <!-- Upload Progress -->
            <div *ngIf="attachmentUploadProgress()" class="mt-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ attachmentUploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ attachmentUploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="attachmentUploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message -->
            <div *ngIf="attachmentUploadSuccess()" class="mt-2 p-2 bg-green-100 text-green-700 rounded text-sm">
              ✅ {{ attachmentUploadSuccess() }}
            </div>

            <!-- Selected Attachments List -->
            <div *ngIf="tempAttachments.length > 0" class="mt-3">
              <div class="text-sm font-medium text-gray-700 mb-2">File đã chọn ({{ tempAttachments.length }}):</div>
              <div class="space-y-1">
                <div *ngFor="let file of tempAttachments; let i = index" class="flex items-center justify-between bg-white p-2 rounded border">
                  <div class="flex items-center gap-2">
                    <div class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{{ getFileExtension(file.name) }}</div>
                    <span class="text-sm">{{ file.name }}</span>
                    <span class="text-xs text-gray-500">({{ formatFileSize(file.size) }})</span>
                  </div>
                  <button type="button" (click)="removeAttachment(i)" class="text-red-600 hover:text-red-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Legacy Document Upload Section (for backward compatibility) -->
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

          <!-- File Attachments Management for Edit -->
          <div class="border border-gray-300 rounded-lg p-3 bg-blue-50">
            <div class="text-sm font-medium text-gray-700 mb-2">Quản lý tệp đính kèm:</div>
            
            <!-- Add New Attachments -->
            <div class="mb-3">
              <div class="text-xs text-gray-600 mb-1">Thêm tệp đính kèm mới:</div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.mp3,.wav"
                multiple
                (change)="onEditAttachmentsUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <div class="text-xs text-gray-500 mt-1">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV (tối đa 100MB/file)</div>
            </div>

            <!-- Upload Progress for Edit -->
            <div *ngIf="editAttachmentUploadProgress()" class="mb-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ editAttachmentUploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ editAttachmentUploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="editAttachmentUploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message for Edit -->
            <div *ngIf="editAttachmentUploadSuccess()" class="mb-2 p-2 bg-green-100 text-green-700 rounded text-sm">
              ✅ {{ editAttachmentUploadSuccess() }}
            </div>

            <!-- Current Attachments List -->
            <div *ngIf="getCurrentLessonForEdit()?.attachments?.length > 0" class="mt-2">
              <div class="text-xs text-gray-600 mb-2">Tệp đính kèm hiện có ({{ getCurrentLessonForEdit()?.attachments?.length }}):</div>
              <div class="space-y-1">
                <div *ngFor="let attachment of getCurrentLessonForEdit()?.attachments; let i = index" 
                     class="flex items-center justify-between bg-white p-2 rounded border text-sm">
                  <div class="flex items-center gap-2">
                    <div class="text-xs px-2 py-1 rounded font-medium" 
                         [class]="getFileTypeClass(attachment.originalFileName)">
                      {{ getFileExtension(attachment.originalFileName) }}
                    </div>
                    <div>
                      <div class="font-medium">{{ attachment.originalFileName }}</div>
                      <div class="text-xs text-gray-500">{{ formatFileSize(attachment.fileSize) }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <a [href]="attachment.fileUrl" target="_blank" 
                       class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                      Xem
                    </a>
                    <button class="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700" 
                            (click)="removeAttachmentFromEditingLesson(attachment.id)">
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
export class SectionEditorComponent implements OnDestroy {

  // Cache of sanitized SafeResourceUrls created from fetched blobs (keyed by original URL)
  safeUrls = signal<Record<string, SafeResourceUrl | null>>({});
  // Keep raw blob URLs so we can revoke them when no longer needed
  private blobUrlMap: Record<string, string> = {};

  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
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

  // File attachments signals
  attachmentUploadProgress = signal<UploadProgress | null>(null);
  attachmentUploadSuccess = signal<string>('');
  
  // PDF upload for current lesson signals
  currentLessonUploadProgress = signal<UploadProgress | null>(null);
  currentLessonUploadSuccess = signal<string>('');
  
  // Edit attachments signals
  editAttachmentUploadProgress = signal<UploadProgress | null>(null);
  editAttachmentUploadSuccess = signal<string>('');
  
  // Show/hide create lesson form
  showCreateForm = signal<boolean>(false);
  
  // Temporary storage for attachments before lesson creation
  tempAttachments: File[] = [];
  
  // Attachment viewer state
  expandedAttachment: number | null = null;

  // PDF fullscreen viewer state
  pdfFullscreenAttachment: any = null;



  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: [''],
    videoUrl: ['']
  });

  editForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: [''],
    videoUrl: ['']
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
      videoUrl: this.createForm.value.videoUrl || undefined
    };
    this.lessonApi.createLesson(sectionId, payload).subscribe({
      next: (res) => {
        const l = res?.data;
        if (l) {
          this.lessons.update(list => [...list, l]);
          
          // Upload attachments if any
          if (this.tempAttachments.length > 0) {
            this.uploadAttachmentsToLesson(l.id);
          }
          
          this.createForm.reset({ title: '', content: '', videoUrl: '' });
          this.resetAttachments();
          
          // Close the form after successful creation
          this.showCreateForm.set(false);
        }
      },
      error: (err) => this.opError.set(err?.message || 'Tạo bài học thất bại')
    });
  }

  startEdit(l: any) {
    this.editingId.set(l.id);
    this.editForm.patchValue({ title: l.title || '', content: l.content || '', videoUrl: l.videoUrl || '' });
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(id: string) {
    if (this.editForm.invalid) return;
    const payload: any = {
      title: this.editForm.value.title || undefined,
      content: this.editForm.value.content || undefined,
      videoUrl: this.editForm.value.videoUrl || undefined
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
    console.log('🎯 viewLesson called for:', l);
    console.log('🎥 Video URL check:', {
      raw: l?.videoUrl,
      hasValid: this.hasValidVideoUrl(l)
    });
    
    this.selected.set(l);
    
    // Only setup video embed if video URL exists and is valid
    if (this.hasValidVideoUrl(l)) {
      const url = l.videoUrl.trim();
      if (this.isYouTube(url)) {
        const embed = this.toYouTubeEmbed(url);
        this._sanitizedEmbed.set(this.sanitizer.bypassSecurityTrustResourceUrl(embed));
        console.log('✅ YouTube embed setup for:', url);
      } else {
        this._sanitizedEmbed.set(null);
        console.log('📹 Non-YouTube video URL:', url);
      }
    } else {
      // No valid video URL, clear any previous embed
      this._sanitizedEmbed.set(null);
      console.log('❌ No valid video URL, clearing embed');
    }
    
    // Load attachments for this lesson - THIS IS CRITICAL!
    console.log('📎 Loading attachments for lesson:', l.id);
    this.loadLessonAttachments(l.id);
  }

  closeViewer() {
    this.selected.set(null);
    this._sanitizedEmbed.set(null);
    this.expandedAttachment = null;
    this.closePdfFullscreen();
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

  hasValidVideoUrl(lesson: any): boolean {
    const url = lesson?.videoUrl;
    // Check for null, undefined, empty string, or whitespace-only string
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }
    
    // Additional check for common invalid values
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl === 'null' || cleanUrl === 'undefined' || cleanUrl === '') {
      return false;
    }
    
    // Try to create URL to validate format
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
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

  // Handle file attachments upload for edit
  onEditAttachmentsUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;

    const lesson = this.getCurrentLessonForEdit();
    if (!lesson) {
      this.opError.set('Không tìm thấy bài học để chỉnh sửa');
      return;
    }

    // Process each file
    Array.from(files).forEach(file => {
      this.uploadAttachmentForEdit(file, lesson.id);
    });

    // Clear file input
    input.value = '';
  }

  // Upload single attachment for editing lesson
  private uploadAttachmentForEdit(file: File, lessonId: string) {
    // Validate file
    const validation = this.validateAttachmentFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'File không hợp lệ');
      return;
    }

    console.log('📤 Uploading attachment to lesson (edit):', lessonId, 'File:', file.name);

    // Reset states
    this.editAttachmentUploadProgress.set(null);
    this.editAttachmentUploadSuccess.set('');
    this.opError.set('');

    // Upload attachment to lesson
    this.lessonAttachmentApi.addAttachment(lessonId, file, 0).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.editAttachmentUploadProgress.set(result);
        } else {
          // Upload completed
          this.editAttachmentUploadProgress.set(null);
          this.editAttachmentUploadSuccess.set(`Đã thêm: ${file.name}`);
          
          // Reload attachments for this lesson
          console.log('🔄 Reloading attachments after edit upload...');
          this.loadLessonAttachments(lessonId);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.editAttachmentUploadSuccess.set('');
          }, 3000);
        }
      },
      error: (error) => {
        console.error('📤 Edit upload error:', error);
        this.editAttachmentUploadProgress.set(null);
        
        let errorMsg = `Lỗi upload: ${file.name}`;
        if (error?.status === 403) {
          errorMsg += ' - Không có quyền upload';
        } else if (error?.status === 401) {
          errorMsg += ' - Phiên đăng nhập hết hạn';
        } else {
          errorMsg += ` - ${error?.message || 'Lỗi không xác định'}`;
        }
        
        this.opError.set(errorMsg);
      }
    });
  }

  // Get current lesson being edited
  getCurrentLessonForEdit(): any {
    const editId = this.editingId();
    if (!editId) return null;
    return this.lessons().find(l => l.id === editId);
  }

  // Remove attachment from editing lesson
  removeAttachmentFromEditingLesson(attachmentId: string) {
    const lesson = this.getCurrentLessonForEdit();
    if (!lesson) return;

    this.lessonAttachmentApi.deleteAttachment(attachmentId).subscribe({
      next: () => {
        console.log('🗑️ Attachment deleted successfully');
        // Reload attachments for this lesson
        this.loadLessonAttachments(lesson.id);
      },
      error: (error) => {
        console.error('🗑️ Delete attachment error:', error);
        this.opError.set('Lỗi xóa tệp đính kèm: ' + (error?.message || 'Lỗi không xác định'));
      }
    });
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

  // --- File Attachments Upload Methods ---
  onFileAttachmentsUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.uploadFileAttachment(file);
    }
  }

  private uploadFileAttachment(file: File) {
    // Reset states
    this.attachmentUploadProgress.set(null);
    this.attachmentUploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.validateAttachmentFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Store file temporarily to attach to the next created lesson
    if (!this.tempAttachments) {
      this.tempAttachments = [];
    }
    this.tempAttachments.push(file);
    this.attachmentUploadSuccess.set(`Đã thêm file: ${file.name}. File sẽ được đính kèm khi tạo bài học.`);
  }

  private validateAttachmentFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 100MB limit'
      };
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.mp4', '.avi', '.mov', '.mp3', '.wav'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        isValid: false,
        error: 'Only PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV files are supported'
      };
    }

    return { isValid: true };
  }

  private refreshLessons() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    this.lessonApi.listBySection(sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách bài học')
    });
  }

  resetForm() {
    this.createForm.reset();
    this.uploadSuccess.set('');
    this.uploadProgress.set(null);
    this.attachmentUploadSuccess.set('');
    this.attachmentUploadProgress.set(null);
    this.opError.set('');
    this.resetAttachments();
  }

  toggleCreateForm() {
    this.showCreateForm.update(show => !show);
    // Reset form when opening
    if (this.showCreateForm()) {
      this.resetForm();
    }
  }

  private uploadAttachmentsToLesson(lessonId: string) {
    if (this.tempAttachments.length === 0) return;

    // Debug authentication
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('lms_user');
    console.log('🔐 Debug Auth Status:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasUser: !!userStr,
      user: userStr ? JSON.parse(userStr) : null
    });

    this.attachmentUploadProgress.set({
      progress: 0,
      status: 'uploading',
      message: `Uploading ${this.tempAttachments.length} attachments...`
    });

    // Upload each attachment
    let completedUploads = 0;
    const totalUploads = this.tempAttachments.length;

    this.tempAttachments.forEach((file, index) => {
      this.lessonAttachmentApi.addAttachment(lessonId, file, index).subscribe({
        next: (result) => {
          if ('progress' in result) {
            // Progress update
            this.attachmentUploadProgress.set(result);
          } else {
            // Upload completed for this file
            completedUploads++;
            const overallProgress = Math.round((completedUploads / totalUploads) * 100);
            
            if (completedUploads === totalUploads) {
              // All uploads completed
              this.attachmentUploadProgress.set(null);
              this.attachmentUploadSuccess.set(`Successfully uploaded ${totalUploads} attachments`);
            } else {
              this.attachmentUploadProgress.set({
                progress: overallProgress,
                status: 'uploading',
                message: `Uploaded ${completedUploads}/${totalUploads} attachments`
              });
            }
          }
        },
        error: (error) => {
          console.error('📤 Attachment upload error:', {
            file: file.name,
            error: error,
            status: error?.status,
            message: error?.message,
            details: error?.error
          });
          
          let errorMsg = `Lỗi upload ${file.name}`;
          if (error?.status === 403) {
            errorMsg += ': Không có quyền. Vui lòng đăng nhập với tài khoản TEACHER.';
          } else if (error?.status === 401) {
            errorMsg += ': Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
          } else {
            errorMsg += `: ${error?.message || 'Lỗi không xác định'}`;
          }
          
          this.opError.set(errorMsg);
          this.attachmentUploadProgress.set(null);
        }
      });
    });
  }

  private resetAttachments() {
    this.tempAttachments = [];
    this.attachmentUploadSuccess.set('');
    this.attachmentUploadProgress.set(null);
  }

  removeAttachment(index: number) {
    this.tempAttachments.splice(index, 1);
    if (this.tempAttachments.length === 0) {
      this.attachmentUploadSuccess.set('');
    }
  }

  getFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toUpperCase() || '';
    return ext;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // File type detection methods
  isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }

  isPresentationFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.ppt') || ext.endsWith('.pptx');
  }

  isOfficeFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.doc') || ext.endsWith('.docx') || 
           ext.endsWith('.xls') || ext.endsWith('.xlsx') ||
           ext.endsWith('.ppt') || ext.endsWith('.pptx');
  }

  isImageFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
           ext.endsWith('.png') || ext.endsWith('.gif') || 
           ext.endsWith('.bmp') || ext.endsWith('.webp');
  }

  isVideoFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.mp4') || ext.endsWith('.avi') || 
           ext.endsWith('.mov') || ext.endsWith('.wmv') || 
           ext.endsWith('.webm');
  }

  isAudioFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.mp3') || ext.endsWith('.wav') || 
           ext.endsWith('.aac') || ext.endsWith('.ogg');
  }

  getFileTypeClass(fileName: string): string {
    if (this.isPdfFile(fileName)) return 'bg-red-100 text-red-800';
    if (this.isPresentationFile(fileName)) return 'bg-green-100 text-green-800';
    if (this.isOfficeFile(fileName)) return 'bg-blue-100 text-blue-800';
    if (this.isImageFile(fileName)) return 'bg-purple-100 text-purple-800';
    if (this.isVideoFile(fileName)) return 'bg-yellow-100 text-yellow-800';
    if (this.isAudioFile(fileName)) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  }

  getVideoMimeType(fileName: string): string {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.mp4')) return 'video/mp4';
    if (ext.endsWith('.webm')) return 'video/webm';
    if (ext.endsWith('.avi')) return 'video/avi';
    if (ext.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
  }

  getAudioMimeType(fileName: string): string {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.mp3')) return 'audio/mpeg';
    if (ext.endsWith('.wav')) return 'audio/wav';
    if (ext.endsWith('.aac')) return 'audio/aac';
    if (ext.endsWith('.ogg')) return 'audio/ogg';
    return 'audio/mpeg';
  }

  toggleAttachmentViewer(index: number) {
    const newVal = this.expandedAttachment === index ? null : index;
    this.expandedAttachment = newVal;
    if (newVal !== null && this.selected() && this.selected().attachments) {
      const attachment = this.selected().attachments[newVal];
      if (attachment && attachment.fileUrl) {
        this.prefetchAndCreateBlob(attachment.fileUrl).catch(() => {});
      }
    }
  }


  getSafeUrl(url: string): any {
    // Prefer blob-based object URLs (works around servers that forbid framing via X-Frame-Options)
    const cache = this.safeUrls();
    if (cache[url]) return cache[url];

    // If we already created a blob URL for this original URL, use it
    const existingBlob = this.blobUrlMap[url];
    if (existingBlob) {
      const safe = this.sanitizer.bypassSecurityTrustResourceUrl(existingBlob);
      this.safeUrls.set({ ...cache, [url]: safe });
      return safe;
    }

    // Fallback: return sanitized remote URL immediately, and start a background prefetch to create blob URL
    const sanitized = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.safeUrls.set({ ...cache, [url]: sanitized });
    
    // Try prefetch in background - but don't wait for it
    this.prefetchAndCreateBlob(url).catch(err => {
      console.warn('Prefetch PDF failed for', url, '- using direct URL fallback', err);
    });
    
    return sanitized;
  }

  getOfficeViewerUrl(fileUrl: string): any {
    // Use Microsoft Office Online Viewer
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  /**
   * Try to fetch a remote PDF and create a blob URL so it can be embedded even if the remote site
   * sends X-Frame-Options that would block direct framing. This only works if the server allows
   * CORS (Access-Control-Allow-Origin) for the resource. If not possible, the original remote URL
   * will remain the fallback.
   */
  private async prefetchAndCreateBlob(url: string) {
    try {
      // Use fetch to get the resource as a blob. The server must allow cross-origin requests.
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const blob = await res.blob();
      // Create object URL and sanitize it
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlMap[url] = blobUrl;
      const safe = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      const cache = this.safeUrls();
      this.safeUrls.set({ ...cache, [url]: safe });
    } catch (err) {
      // If CORS prevents fetching, we leave the remote URL as fallback.
      console.warn('Could not prefetch PDF as blob for', url, err);
    }
  }

  ngOnDestroy(): void {
    // Revoke any created blob URLs
    for (const k of Object.keys(this.blobUrlMap)) {
      try { URL.revokeObjectURL(this.blobUrlMap[k]); } catch {}
    }
    this.blobUrlMap = {};
  }

  openPdfFullscreen(attachment: any) {
    this.pdfFullscreenAttachment = attachment;
  }

  closePdfFullscreen() {
    // Revoke blob URL associated with this attachment if we created one
    if (this.pdfFullscreenAttachment && this.pdfFullscreenAttachment.fileUrl) {
      const original = this.pdfFullscreenAttachment.fileUrl;
      const blob = this.blobUrlMap[original];
      if (blob) {
        try { URL.revokeObjectURL(blob); } catch {}
        delete this.blobUrlMap[original];
        const cache = this.safeUrls();
        delete cache[original];
        this.safeUrls.set({ ...cache });
      }
    }
    this.pdfFullscreenAttachment = null;
  }



  removeAttachmentFromLesson(lessonId: string, attachmentId: string) {
    this.lessonAttachmentApi.deleteAttachment(attachmentId).subscribe({
      next: () => {
        // Refresh lesson attachments
        this.loadLessonAttachments(lessonId);
      },
      error: (err) => this.opError.set(err?.message || 'Xóa file đính kèm thất bại')
    });
  }

  private loadLessonAttachments(lessonId: string) {
    console.log('📎 loadLessonAttachments called for lesson:', lessonId);
    
    this.lessonAttachmentApi.getAttachments(lessonId).subscribe({
      next: (attachments) => {
        console.log('✅ Attachments loaded:', attachments);
        console.log('📊 Attachment details:', {
          count: attachments?.length || 0,
          attachments: attachments
        });
        
        // Update the selected lesson with attachments
        this.selected.update(lesson => {
          if (lesson && lesson.id === lessonId) {
            const updatedLesson = { ...lesson, attachments };
            console.log('🔄 Updated selected lesson with attachments:', updatedLesson);
            return updatedLesson;
          }
          return lesson;
        });
        
        // Also update the lesson in the lessons list for future reference
        this.lessons.update(lessonList => 
          lessonList.map(l => 
            l.id === lessonId ? { ...l, attachments } : l
          )
        );
      },
      error: (err) => {
        console.error('❌ Failed to load attachments for lesson', lessonId, ':', err);
        console.error('❌ Error details:', {
          status: err?.status,
          message: err?.message,
          error: err?.error
        });
        // Show error in UI
        this.opError.set(`Không thể tải attachments: ${err?.message || 'Lỗi không xác định'}`);
      }
    });
  }

  // Scanned Documents Methods - DEPRECATED (now using real lesson attachments)
  /*
  private loadScannedDocuments() {
    // No longer needed - using real lesson attachments
  }

  private fetchScannedDocumentsFromAPI() {
    // No longer needed - using real lesson attachments  
  }

  private loadFallbackScannedDocuments() {
    // No longer needed - using real lesson attachments
  }

  toggleScannedDocumentViewer(index: number) {
    // No longer needed - using togglePdfAttachmentViewer instead
  }

  openScannedDocumentFullscreen(doc: any) {
    // No longer needed - using openPdfAttachmentFullscreen instead
  }
  */

  // New methods for PDF attachments from lessons
  // Lesson PDF Methods (updated to use real attachments)
  getLessonPdfs(lessonId: string): any[] {
    const lesson = this.lessons().find(l => l.id === lessonId);
    if (!lesson || !lesson.attachments) return [];
    
    return lesson.attachments.filter((attachment: any) => 
      this.isPdfFile(attachment.originalFileName)
    );
  }
}
