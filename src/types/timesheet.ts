// What an employee actually worked on, distinct from `AttendanceLogEntry`'s
// pure clock-in/out timing - hours plus a short description, optionally
// linked to one of their assigned tasks so HR's Task Distribution view can
// show a real breakdown instead of an estimate.

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  description: string;
  taskId?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
