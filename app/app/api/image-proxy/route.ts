import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "komradefoods1025-geskw.wpcomstaging.com",
  "komradefoods1025-geskw.wordpress.com",
]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";

  if (!rawUrl) {
    return new NextResponse("Missing url", { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (targetUrl.protocol !== "https:") {
    return new NextResponse("Only https is allowed", { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return new NextResponse("Host is not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse("Failed to fetch image", {
        status: upstream.status,
      });
    }

    const contentType =
      upstream.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Image proxy error", { status: 500 });
  }
}
