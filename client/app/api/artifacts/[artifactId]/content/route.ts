import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { VIEWER_COOKIE_NAME } from "../../../../../lib/viewer";

const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000";
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLSM_MIME_TYPE = "application/vnd.ms-excel.sheet.macroEnabled.12";

function inferContentType(
  upstreamContentType: string | null,
  contentDisposition: string | null
) {
  if (upstreamContentType && upstreamContentType !== "application/octet-stream") {
    return upstreamContentType;
  }

  const lowerDisposition = contentDisposition?.toLowerCase() ?? "";
  if (lowerDisposition.includes(".docx")) {
    return DOCX_MIME_TYPE;
  }
  if (lowerDisposition.includes(".xlsx")) {
    return XLSX_MIME_TYPE;
  }
  if (lowerDisposition.includes(".xlsm")) {
    return XLSM_MIME_TYPE;
  }

  return upstreamContentType ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params;
  const cookieStore = await cookies();
  const viewer = cookieStore.get(VIEWER_COOKIE_NAME)?.value?.trim();
  const url = new URL(`${apiBaseUrl}/api/artifacts/${artifactId}/content`);
  if (viewer) {
    url.searchParams.set("viewer", decodeURIComponent(viewer));
  }

  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return new NextResponse(errorBody, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "text/plain; charset=utf-8"
      }
    });
  }

  const headers = new Headers();
  const upstreamContentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  const contentType = inferContentType(upstreamContentType, contentDisposition);

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }

  const payload = await response.arrayBuffer();

  return new NextResponse(payload, {
    status: response.status,
    headers
  });
}
