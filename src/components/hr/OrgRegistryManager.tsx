"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { OrgRegistryItem, OrgRegistryResource } from "@/types/hr";
import styles from "./OrgRegistryManager.module.css";

interface OrgRegistryManagerProps {
  resource: OrgRegistryResource;
  title: string;
  initialItems: OrgRegistryItem[];
}

// Small CRUD list for one org registry resource (departments, designations,
// or locations) - `GET/POST /api/superadmin/org/[resource]` and
// `DELETE .../[resource]/[id]` back all three instances of this component.
export default function OrgRegistryManager({ resource, title, initialItems }: OrgRegistryManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/org/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add.");
        return;
      }
      setItems((prev) => [...prev, data.item]);
      setName("");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/superadmin/org/${resource}/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <span>{item.name}</span>
            <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className={styles.empty}>None yet.</li>}
      </ul>
      <form className={styles.addForm} onSubmit={add}>
        <input type="text" placeholder={`Add ${title.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={submitting} aria-label="Add">
          <Plus size={14} />
        </button>
      </form>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
