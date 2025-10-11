import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';

@Component({
  selector: 'app-assignment-creation',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Tạo bài tập mới</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <input formControlName="title" type="text" class="w-full border rounded px-3 py-2" placeholder="VD: Safety Quiz" />
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.title.invalid && form.controls.title.touched">
            Tiêu đề bắt buộc (tối đa 255 ký tự)
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
          <select formControlName="courseId" class="w-full border rounded px-3 py-2">
            <option value="" disabled>Chọn khóa học</option>
            <option *ngFor="let c of teacher.courses()" [value]="c.id">{{ c.title }}</option>
          </select>
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.courseId.invalid && form.controls.courseId.touched">
            Vui lòng chọn khóa học
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
          <input formControlName="dueDate" type="date" class="w-full border rounded px-3 py-2" />
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.dueDate.invalid && form.controls.dueDate.touched">
            Vui lòng chọn hạn nộp
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea formControlName="description" rows="4" class="w-full border rounded px-3 py-2" placeholder="Mô tả bài tập..."></textarea>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" [disabled]="form.invalid || submitting" class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {{ submitting ? 'Đang tạo...' : 'Tạo bài tập' }}
          </button>
          <a routerLink="/teacher/assignments" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
          <span class="text-green-700" *ngIf="success">{{ success }}</span>
          <span class="text-red-600" *ngIf="error">{{ error }}</span>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentCreationComponent {
  teacher = inject(TeacherService);
  fb = inject(FormBuilder);
  router = inject(Router);

  submitting = false;
  success = '';
  error = '';

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    courseId: ['', [Validators.required]],
    dueDate: ['', [Validators.required]],
    description: ['']
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true; this.success = ''; this.error = '';
    const { title, courseId, dueDate, description } = this.form.getRawValue();
    try {
      const assignment = await this.teacher.createAssignment({
        title: title!,
        courseId: courseId!,
        description: description || '',
        dueDate: dueDate!,
        status: 'pending',
        submissions: 0,
        totalStudents: this.teacher.getStudentsByCourse(courseId!).length,
        averageScore: 0
      });
      this.success = 'Tạo bài tập thành công';
      await this.router.navigate(['/teacher/assignments', assignment.id, 'edit']);
    } catch (e: any) {
      this.error = 'Tạo bài tập thất bại';
    } finally {
      this.submitting = false;
    }
  }
}