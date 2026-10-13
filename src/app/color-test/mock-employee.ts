import type { EmployeeOverview } from "@/types/hr";

// Fabricated record for the color-test sandbox only - lets this page reuse
// the real Profile components (ProfileHeader/PersonalDetails/ContactDetails/
// WorkDetails) without a session or the Employee Master store. Delete this
// file along with the rest of src/app/color-test when styling is done.
export const MOCK_EMPLOYEE: EmployeeOverview = {
  id: "mock-1",
  employeeCode: "EMP-0001",
  name: "Aisha Khan",
  initials: "AK",
  email: "aisha.khan@example.com",
  department: "Engineering",
  designation: "Software Engineer",
  status: "Active",
  joinedOn: "2025-01-14",
  age: 29,
  salary: 1440000,
  performanceScore: 86,
  attendancePct: 96,
  leave: { remaining: 8, allocated: 12 },
  tasks: { completed: 14, active: 3, completionPct: 82 },
  pendingRequests: 1,

  phone: "+91 98765 43210",
  personalEmail: "aisha.khan@example.com",
  dateOfBirth: "1996-03-14",
  gender: "Female",
  maritalStatus: "Single",
  currentAddress: "Bengaluru, KA",
  permanentAddress: "Lucknow, UP",
  emergencyContact: { name: "Imran Khan", relation: "Father", phone: "+91 90000 11111" },
  education: [{ id: "ed1", degree: "B.Tech, Computer Science", institution: "IIT Delhi", year: "2019" }],
  experience: [{ id: "ex1", role: "Frontend Engineer", company: "Previous Co", durationYears: 2 }],
  managerId: "mock-2",
  location: "Bengaluru",
  workType: "Hybrid",
  employmentType: "Full-time",
  grade: "L3",
  skills: ["TypeScript", "React", "Next.js"],
  onboardingTasks: [],
  lifecycleHistory: [],
  deactivated: false,
};

export const MOCK_MANAGER_NAME = "Rohan Mehta";
