import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';

@Component({
  selector: 'app-assignment-editor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6 space-y-6" *ngIf="assignmentId">
      <h1 class="text-2xl font-bold text-gray-900">Chỉnh sửa bài tập</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <input formControlName="title" type="text" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea formControlName="description" rows="4" class="w-full border rounded px-3 py-2"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
            <input formControlName="dueDate" type="date" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select formControlName="status" class="w-full border rounded px-3 py-2">
              <option value="pending">pending</option>
              <option value="submitted">submitted</option>
              <option value="graded">graded</option>
              <option value="overdue">overdue</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" [disabled]="form.invalid || submitting" class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {{ submitting ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
          <a [routerLink]="['/teacher/assignments', assignmentId, 'submissions']" class="text-sm text-indigo-600">Xem bài nộp</a>
          <a routerLink="/teacher/assignments" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
          <span class="text-green-700" *ngIf="success">{{ success }}</span>
          <span class="text-red-600" *ngIf="error">{{ error }}</span>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentEditorComponent {
  teacher = inject(TeacherService);
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);

  assignmentId = this.route.snapshot.paramMap.get('id') || '';
  submitting = false;
  success = '';
  error = '';

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    dueDate: ['', [Validators.required]],
    status: ['pending', [Validators.required]]
  });

  constructor() {
    const a = this.teacher.assignments().find(x => x.id === this.assignmentId);
    if (a) {
      this.form.patchValue({
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        status: a.status
      });
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true; this.success = ''; this.error = '';
    try {
      const raw = this.form.getRawValue();
      await this.teacher.updateAssignment(this.assignmentId, {
        title: raw.title || undefined,
        description: raw.description || undefined,
        dueDate: raw.dueDate || undefined,
        status: raw.status as any
      });
      this.success = 'Đã lưu thay đổi';
    } catch (e: any) {
      this.error = 'Cập nhật thất bại';
    } finally {
      this.submitting = false;
    }
  }
}