import "server-only";

import { getActiveViewer } from "../lib/server-viewer";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const viewer = await getActiveViewer();
  const url = new URL(`${baseUrl}${path}`);
  if (viewer) {
    url.searchParams.set("viewer", viewer);
  }

  const response = await fetch(url, {
    cache: "no-store",
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
