import "server-only";

import { cookies } from "next/headers";
import { VIEWER_COOKIE_NAME } from "./viewer";

export async function getActiveViewer(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const viewer = cookieStore.get(VIEWER_COOKIE_NAME)?.value?.trim();
  return viewer ? decodeURIComponent(viewer) : undefined;
}
