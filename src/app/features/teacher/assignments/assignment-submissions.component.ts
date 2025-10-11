import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';

@Component({
  selector: 'app-assignment-submissions',
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Bài nộp</h1>
      <div class="bg-white rounded-lg shadow overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Học viên</th>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Điểm</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let s of paged(); trackBy: trackByIndex">
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-900">{{ s.name }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class.bg-blue-100]="s.status === 'submitted'"
                      [class.text-blue-800]="s.status === 'submitted'"
                      [class.bg-gray-100]="s.status !== 'submitted'"
                      [class.text-gray-800]="s.status !== 'submitted'">
                  {{ s.status === 'submitted' ? 'Đã nộp' : 'Chưa nộp' }}
                </span>
              </td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ s.score ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div class="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Hiển thị</span>
          <select class="border rounded px-2 py-1" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
            <option [ngValue]="5">5</option>
            <option [ngValue]="10">10</option>
            <option [ngValue]="20">20</option>
          </select>
          <span class="text-sm text-gray-600">mỗi trang</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() <= 1" (click)="prevPage()">Trước</button>
          <span class="text-sm text-gray-700">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
          <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() >= totalPages()" (click)="nextPage()">Sau</button>
        </div>
        <div class="text-sm text-gray-600">Tổng: {{ total() }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentSubmissionsComponent {
  route = inject(ActivatedRoute);
  teacher = inject(TeacherService);
  pageIndex = signal(1);
  pageSize = signal(10);
  submissions = signal<{ name: string; status: 'submitted'|'pending'; score?: number }[]>([]);
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.submissions().slice(start, start + this.pageSize());
  });
  total = computed(() => this.submissions().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  goToPage(n: number) { this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); }
  nextPage() { this.goToPage(this.pageIndex() + 1); }
  prevPage() { this.goToPage(this.pageIndex() - 1); }
  onPageSizeChange(v?: any) { if (v !== undefined) this.pageSize.set(Number(v)); this.goToPage(1); }

  constructor() {
    const assignmentId = this.route.snapshot.paramMap.get('id')!;
    // Mock: derive submissions list from students of course owning this assignment
    const a = this.teacher.assignments().find(x => x.id === assignmentId);
    const students = a ? this.teacher.getStudentsByCourse(a.courseId) : [];
    this.submissions.set(students.map((s, idx) => ({
      name: s.name,
      status: idx % 2 === 0 ? 'submitted' : 'pending',
      score: idx % 2 === 0 ? Math.round(6 + Math.random()*4) : undefined
    })));
  }

  trackByIndex(i: number) { return i; }
}