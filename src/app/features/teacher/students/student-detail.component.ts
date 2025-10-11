import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';

@Component({
  selector: 'app-student-detail',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6" *ngIf="student">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Học viên: {{ student.name }}</h1>
        <a routerLink="/teacher/students" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
      </div>
      <div class="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="col-span-1 flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xl font-bold">
            {{ getInitials(student.name) }}
          </div>
          <div>
            <p class="text-lg font-semibold text-gray-900">{{ student.name }}</p>
            <p class="text-sm text-gray-600">{{ student.email }}</p>
            <p class="text-sm text-gray-600">ID: {{ student.studentId }}</p>
          </div>
        </div>
        <div class="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Tiến độ</p>
            <p class="text-2xl font-semibold">{{ student.progress }}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Điểm trung bình</p>
            <p class="text-2xl font-semibold">{{ student.averageGrade }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Khoa</p>
            <p class="text-2xl font-semibold">{{ student.department }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Trạng thái</p>
            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
              [class.bg-green-100]="student.status === 'active'"
              [class.text-green-800]="student.status === 'active'"
              [class.bg-gray-100]="student.status === 'inactive'"
              [class.text-gray-800]="student.status === 'inactive'"
              [class.bg-yellow-100]="student.status === 'suspended'"
              [class.text-yellow-800]="student.status === 'suspended'"
            >{{ student.status }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Khóa học đã ghi danh</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let c of enrolledCourses" class="border rounded-lg p-4">
            <p class="font-medium text-gray-900">{{ c.title }}</p>
            <p class="text-sm text-gray-500">Mã: {{ c.id }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDetailComponent {
  route = inject(ActivatedRoute);
  teacher = inject(TeacherService);
  student = undefined as any;
  enrolledCourses: any[] = [];
  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.student = this.teacher.getStudentById(id);
    if (this.student) {
      this.enrolledCourses = (this.student.courses || this.student.enrolledCourses || [])
        .map((cid: string) => this.teacher.getCourseById(cid))
        .filter(Boolean);
    }
  }
}