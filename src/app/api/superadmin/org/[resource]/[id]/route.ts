import { NextResponse } from "next/server";
import { BackendError } from "@/lib/api/backend";
import { deleteOrgRegistryItem, patchOrgRegistryItem } from "@/lib/hr/org-registry-store";
import { getSession } from "@/lib/auth/get-session";
import type { OrgRegistryResource } from "@/types/hr";

export const dynamic = "force-dynamic";

const RESOURCES: OrgRegistryResource[] = ["departments", "designations", "locations"];

function isResource(value: string): value is OrgRegistryResource {
  return (RESOURCES as string[]).includes(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const session = await getSession();
  if (session?.role !== "HR") {
    return NextResponse.json({ error: "Only HR can edit the org structure." }, { status: 403 });
  }

  const { resource, id } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  try {
    const item = await patchOrgRegistryItem(resource, id, { name });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json({ error: err.detail }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const session = await getSession();
  if (session?.role !== "HR") {
    return NextResponse.json({ error: "Only HR can edit the org structure." }, { status: 403 });
  }

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
