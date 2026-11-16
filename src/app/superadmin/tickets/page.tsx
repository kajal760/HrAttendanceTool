import type { Metadata } from "next";
import { Ticket } from "lucide-react";

export const metadata: Metadata = {
  title: "Ticket / Support | HumSetu",
};

export default function TicketsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", textAlign: "center" }}>
      <Ticket size={32} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Ticket / Support</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
        Support ticketing is coming soon.
      </p>
    </div>
  );
}
