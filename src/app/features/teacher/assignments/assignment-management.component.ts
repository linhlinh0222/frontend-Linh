import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherService } from '../infrastructure/services/teacher.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assignment-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Bài tập</h1>
        <a routerLink="/teacher/assignment-creation" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">+ Tạo bài tập</a>
      </div>

      <div class="bg-white rounded-xl shadow">
        <div class="p-4 flex flex-wrap gap-3 items-center">
          <input class="border rounded px-3 py-2 w-64" placeholder="Tìm theo tên hoặc mô tả" [(ngModel)]="keyword" />
          <select class="border rounded px-3 py-2" [(ngModel)]="statusFilter">
            <option value="">Tất cả trạng thái</option>
            <option value="pending">pending</option>
            <option value="submitted">submitted</option>
            <option value="graded">graded</option>
            <option value="overdue">overdue</option>
          </select>
          <button class="px-4 py-2 border rounded" (click)="applyFilters()">Lọc</button>
        </div>
        <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th (click)="setSort('title')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Tên <span class="text-xs" *ngIf="sortKey==='title'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('courseId')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Khóa học <span class="text-xs" *ngIf="sortKey==='courseId'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('dueDate')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Hạn <span class="text-xs" *ngIf="sortKey==='dueDate'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('status')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Trạng thái <span class="text-xs" *ngIf="sortKey==='status'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('submissions')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Nộp <span class="text-xs" *ngIf="sortKey==='submissions'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th class="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let a of paged(); trackBy: trackById">
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-900">{{ a.title }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">#{{ a.courseId }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ a.dueDate }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class.bg-yellow-100]="a.status === 'pending'"
                      [class.text-yellow-800]="a.status === 'pending'"
                      [class.bg-blue-100]="a.status === 'submitted'"
                      [class.text-blue-800]="a.status === 'submitted'"
                      [class.bg-green-100]="a.status === 'graded'"
                      [class.text-green-800]="a.status === 'graded'"
                      [class.bg-red-100]="a.status === 'overdue'"
                      [class.text-red-800]="a.status === 'overdue'">
                  {{ a.status }}
                </span>
              </td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ a.submissions }}/{{ a.totalStudents }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-right text-base md:text-lg">
                <a [routerLink]="['/teacher/assignments', a.id, 'edit']" class="text-indigo-600 hover:text-indigo-900">Sửa</a>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <div class="p-6 text-gray-500" *ngIf="paged().length === 0">Chưa có bài tập.</div>
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
export class AssignmentManagementComponent {
  teacher = inject(TeacherService);
  pageIndex = signal(1);
  pageSize = signal(10);
  keyword = '';
  statusFilter: '' | 'pending' | 'submitted' | 'graded' | 'overdue' = '';
  sortKey: 'title'|'courseId'|'dueDate'|'status'|'submissions' = 'dueDate';
  sortDir: 'asc'|'desc' = 'asc';
  base = computed(() => this.teacher.assignments());
  filtered = computed(() => this.base().filter(a =>
    (!this.statusFilter || a.status === this.statusFilter) &&
    (!this.keyword || a.title.toLowerCase().includes(this.keyword.toLowerCase()) || (a.description||'').toLowerCase().includes(this.keyword.toLowerCase()))
  ));
  sorted = computed(() => [...this.filtered()].sort((a,b)=>{
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const va: any = (a as any)[this.sortKey];
    const vb: any = (b as any)[this.sortKey];
    return (va>vb ? 1 : va<vb ? -1 : 0) * dir;
  }));
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });
  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  goToPage(n: number) { this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); }
  nextPage() { this.goToPage(this.pageIndex() + 1); }
  prevPage() { this.goToPage(this.pageIndex() - 1); }
  onPageSizeChange(v?: any) { if (v !== undefined) this.pageSize.set(Number(v)); this.goToPage(1); }
  applyFilters() { this.goToPage(1); }
  setSort(key: typeof this.sortKey) {
    if (this.sortKey === key) { this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'; }
    else { this.sortKey = key; this.sortDir = 'asc'; }
    this.goToPage(1);
  }

  trackById(_i: number, item: any) { return item.id; }
}