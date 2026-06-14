export interface Course {
  id: number;
  name: string;
  courseCode: string;
}

export interface Module {
  id: number;
  courseId: number;
  name: string;
  position: number;
}

export interface Assignment {
  id: number;
  courseId: number;
  name: string;
  description: string | null;
  dueAt: string | null;
}

export interface Announcement {
  id: number;
  courseId: number;
  title: string;
  message: string;
  postedAt: string;
}
