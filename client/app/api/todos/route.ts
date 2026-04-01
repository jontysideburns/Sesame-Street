import { NextResponse } from "next/server";

const apiBase = process.env.API_URL ?? "http://localhost:4000";

export async function GET() {
  const res = await fetch(`${apiBase}/api/todos`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${apiBase}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
