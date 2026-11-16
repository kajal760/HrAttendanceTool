import { backend } from "@/lib/api/backend";

// Changing your own password - backed by the FastAPI `/auth/change-password`
// endpoint, which checks the current password server-side and doesn't
// rotate/revoke the existing session token.
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await backend("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
}
