import { NextResponse } from "next/server";
import { addOrgRegistryItem, getOrgRegistry } from "@/lib/hr/org-registry-store";
import type { OrgRegistryResource } from "@/types/hr";

export const dynamic = "force-dynamic";

const RESOURCES: OrgRegistryResource[] = ["departments", "designations", "locations"];

function isResource(value: string): value is OrgRegistryResource {
  return (RESOURCES as string[]).includes(value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  }
  return NextResponse.json({ items: await getOrgRegistry(resource) });
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  }
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }
  const item = await addOrgRegistryItem(resource, name);
  return NextResponse.json({ item }, { status: 201 });
}
