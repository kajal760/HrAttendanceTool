import type { Metadata } from "next";
import ColorTestClient from "./ColorTestClient";

export const metadata: Metadata = {
  title: "Color Test | HR Attendance",
};

// Scratch sandbox for trying out color tokens against the real Profile
// page's structure - no auth, no real data, not linked from any nav.
// Delete this whole src/app/color-test/ directory once styling is settled.
export default function ColorTestPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <ColorTestClient />
    </div>
  );
}
