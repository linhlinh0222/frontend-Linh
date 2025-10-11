import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CourseRepository, CourseStatistics } from '../../domain/repositories/course.repository';
import { Course } from '../../domain/entities/course.entity';
import { CourseSpecifications } from '../../domain/value-objects/course-specifications';
import {
  CourseId,
  InstructorId,
  CourseStatus,
  CourseLevel,
  CertificateType,
  CourseFilters,
  CourseSortOptions,
  PaginationOptions,
  PaginatedResult
} from '../../domain/types';
import { CourseApi } from '../../../../api/client/course.api';
import { ApiResponse } from '../../../../api/types/common.types';
import { CourseDetail, CourseSummary } from '../../../../api/types/course.types';

/**
 * Repository Implementation: Course Repository Implementation
 * Concrete implementation of CourseRepository interface
 * Handles data access and mapping between domain and infrastructure layers
 */
@Injectable({
  providedIn: 'root'
})
export class CourseRepositoryImpl implements CourseRepository {
  private api = inject(CourseApi);

  findById(id: CourseId): Observable<Course | null> {
    return this.api.getCourseById(id as unknown as string).pipe(
      map((res: ApiResponse<CourseDetail>) => {
        const data = res?.data;
        return data ? this.mapDetailToDomain(data) : null;
      })
    );
  }

  findAll(
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 12;
    const search = filters?.searchQuery ?? undefined;
    const teacher = filters?.instructorId?.[0] as unknown as string | undefined;

    return this.api.publicCourses({ page, limit, search, teacher }).pipe(
      map((res: ApiResponse<CourseSummary[]>) => {
        const items = (res?.data ?? []).map(s => this.mapSummaryToDomain(s));
        const p = res?.pagination;
        const totalPages = p?.totalPages ?? Math.ceil((p?.totalItems ?? items.length) / (p?.limit ?? limit));
        const total = p?.totalItems ?? items.length;
        return {
          items,
          total,
          page: p?.page ?? page,
          limit: p?.limit ?? limit,
          totalPages,
          hasNext: (p?.page ?? page) < totalPages,
          hasPrev: (p?.page ?? page) > 1
        } as PaginatedResult<Course>;
      }),
      catchError(() => {
        // Graceful fallback when backend is down or returns an error (e.g., 403/500)
        return of({
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        } as PaginatedResult<Course>);
      })
    );
  }

  findByInstructor(
    instructorId: InstructorId,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const instructorFilters = { ...filters, instructorId: [instructorId] };
    return this.findAll(instructorFilters, sort, pagination);
  }

  findByCategory(
    category: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const categoryFilters = { ...filters, category: [category] };
    return this.findAll(categoryFilters, sort, pagination);
  }

  search(
    query: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const searchFilters = { ...filters, searchQuery: query };
    return this.findAll(searchFilters, sort, pagination);
  }

  save(course: Course): Observable<Course> {
    // Persisting courses is handled via teacher flows elsewhere; keep no-op here
    return of(course);
  }

  update(id: CourseId, updates: Partial<Course>): Observable<Course> {
    // Not used in public listing flow
    return throwError(() => new Error('Not implemented'));
  }

  delete(id: CourseId): Observable<void> {
    return throwError(() => new Error('Not implemented'));
  }

  exists(id: CourseId): Observable<boolean> {
    return of(false);
  }

  getStatistics(): Observable<CourseStatistics> {
    const stats: CourseStatistics = {
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      archivedCourses: 0,
      totalStudents: 0,
      averageRating: 0,
      totalRevenue: 0,
      coursesByCategory: {},
      coursesByLevel: {}
    };
    return of(stats);
  }

  getPopular(limit: number = 10): Observable<Course[]> {
    return this.findAll({ status: [CourseStatus.PUBLISHED] }, { field: 'students', direction: 'desc' }, { page: 1, limit }).pipe(
      map(r => r.items)
    );
  }

  getNew(limit: number = 10): Observable<Course[]> {
    return this.findAll({ status: [CourseStatus.PUBLISHED] }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit }).pipe(
      map(r => r.items)
    );
  }

  getFeatured(limit: number = 10): Observable<Course[]> {
    return this.findAll({ status: [CourseStatus.PUBLISHED] }, { field: 'rating', direction: 'desc' }, { page: 1, limit }).pipe(
      map(r => r.items)
    );
  }

  private mapSummaryToDomain(s: CourseSummary): Course {
    const now = new Date();
    return new Course(
      (s.id as unknown as string) as CourseId,
      s.title ?? '',
      s.description ?? '',
      (s.description ?? '').slice(0, 120),
      'engineering', // backend doesn't provide category yet
      (s.teacherName ?? 'teacher') as unknown as InstructorId,
      new CourseSpecifications(
        10,
        CourseLevel.BEGINNER,
        s.enrolledCount ?? 0,
        0,
        [],
        CertificateType.COMPLETION,
        0,
        0
      ),
      CourseStatus.PUBLISHED,
      [],
      [],
      '/assets/images/courses/placeholder.png',
      {
        createdAt: s.createdAt ? new Date(s.createdAt as unknown as any) : now,
        updatedAt: now,
        createdBy: (s.teacherName ?? 'teacher') as unknown as InstructorId,
        studentsCount: s.enrolledCount ?? 0,
        rating: 5,
        reviewsCount: 0,
        isPopular: (s.enrolledCount ?? 0) > 50,
        isNew: true,
        version: 1
      }
    );
  }

  private mapDetailToDomain(d: CourseDetail): Course {
    const now = new Date();
    return new Course(
      (d.id as unknown as string) as CourseId,
      d.title ?? '',
      d.description ?? '',
      (d.description ?? '').slice(0, 120),
      'engineering',
      (d.teacherId as unknown as string) as InstructorId,
      new CourseSpecifications(
        10,
        CourseLevel.BEGINNER,
        d.enrolledCount ?? 0,
        0,
        [],
        CertificateType.COMPLETION,
        0,
        0
      ),
      CourseStatus.PUBLISHED,
      [],
      [],
      '/assets/images/courses/placeholder.png',
      {
        createdAt: d.createdAt ? new Date(d.createdAt as unknown as any) : now,
        updatedAt: d.updatedAt ? new Date(d.updatedAt as unknown as any) : now,
        createdBy: (d.teacherId as unknown as string) as InstructorId,
        studentsCount: d.enrolledCount ?? 0,
        rating: 5,
        reviewsCount: 0,
        isPopular: (d.enrolledCount ?? 0) > 50,
        isNew: true,
        version: 1
      }
    );
  }
}