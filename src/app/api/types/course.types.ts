export interface CreateCourseRequest {
  code: string;
  title: string;
  description?: string;
}

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  teacherName: string;
  enrolledCount: number;
  createdAt: string;
}

export interface CourseDetail {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  teacherId: string;
  teacherName: string;
  enrolledCount: number;
  sectionsCount: number;
  createdAt: string;
  updatedAt: string | null;
}

// Course content for learning UI
export interface CourseContentSection {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
}

export interface SectionDetail {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  courseId: string;
  courseTitle: string;
  lessonsCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface LessonDetail {
  id: string;
  title: string;
  description: string;
  content: string;
  videoUrl: string;
  durationMinutes: number;
  orderIndex: number;
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseTitle: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateSectionRequest {
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface UpdateSectionRequest {
  title?: string;
  description?: string;
  orderIndex?: number;
}

export interface CreateLessonRequest {
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  orderIndex?: number;
}

export interface UpdateLessonRequest {
  title?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  orderIndex?: number;
}

export interface FileUploadResponse {
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

// Simplified enrollment request - email only
export interface EnrollStudentRequest {
  email: string;
}
