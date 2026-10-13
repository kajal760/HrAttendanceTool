import { NextResponse } from "next/server";
import { deleteOrgRegistryItem } from "@/lib/hr/org-registry-store";
import type { OrgRegistryResource } from "@/types/hr";

export const dynamic = "force-dynamic";

const RESOURCES: OrgRegistryResource[] = ["departments", "designations", "locations"];

function isResource(value: string): value is OrgRegistryResource {
  return (RESOURCES as string[]).includes(value);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  }
  const removed = await deleteOrgRegistryItem(resource, id);
  if (!removed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
