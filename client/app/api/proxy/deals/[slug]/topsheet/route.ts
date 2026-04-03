import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const res = await fetch(`${API_URL}/api/deals/${slug}/topsheet`, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({}, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data);
}
