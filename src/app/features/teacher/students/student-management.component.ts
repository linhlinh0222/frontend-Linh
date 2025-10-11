import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherService } from '../infrastructure/services/teacher.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-student-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Học viên</h1>

      <div class="bg-white rounded-xl shadow">
        <div class="p-4 flex flex-wrap gap-3 items-center">
          <input class="border rounded-lg px-3 py-2 w-64" placeholder="Tìm theo tên/email" [(ngModel)]="keyword" />
          <select class="border rounded-lg px-3 py-2" [(ngModel)]="status">
            <option value="">Tất cả</option>
            <option value="active">Đang học</option>
            <option value="inactive">Không hoạt động</option>
            <option value="suspended">Tạm khóa</option>
          </select>
          <button class="px-4 py-2 border rounded-lg text-sm" (click)="applyFilters()">Lọc</button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Tên</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Tiến độ</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Điểm</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th class="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let s of paged(); trackBy: trackById">
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg font-medium text-gray-900">{{ s.name }}</td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ s.email }}</td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ s.progress }}%</td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ s.averageGrade }}</td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [class.bg-green-100]="s.status === 'active'"
                        [class.text-green-800]="s.status === 'active'"
                        [class.bg-gray-100]="s.status === 'inactive'"
                        [class.text-gray-800]="s.status === 'inactive'"
                        [class.bg-yellow-100]="s.status === 'suspended'"
                        [class.text-yellow-800]="s.status === 'suspended'">
                    {{ s.status }}
                  </span>
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-right text-base md:text-lg">
                  <a [routerLink]="['/teacher/students', s.id]" class="text-indigo-600 hover:text-indigo-900">Chi tiết</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
export class StudentManagementComponent {
  teacher = inject(TeacherService);

  keyword = '';
  status: '' | 'active' | 'inactive' | 'suspended' = '';
  filtered = signal(this.teacher.students());
  pageIndex = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    this.filtered.set(
      this.teacher
        .students()
        .filter(s => !this.status || s.status === this.status)
        .filter(s => !kw || s.name.toLowerCase().includes(kw) || s.email.toLowerCase().includes(kw))
    );
    this.pageIndex.set(1);
  }
  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  goToPage(n: number) { this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); }
  nextPage() { this.goToPage(this.pageIndex() + 1); }
  prevPage() { this.goToPage(this.pageIndex() - 1); }
  onPageSizeChange(v?: any) { if (v !== undefined) this.pageSize.set(Number(v)); this.goToPage(1); }

  trackById(_i: number, item: any) { return item.id; }
}