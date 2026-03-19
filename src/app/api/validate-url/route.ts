import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "URL must use HTTP or HTTPS" }, { status: 400 });
  }

  // Check if URL ends with .mp4
  const pathLower = parsedUrl.pathname.toLowerCase();
  if (!pathLower.endsWith(".mp4")) {
    return NextResponse.json(
      { error: "URL must point to an MP4 file (ending in .mp4)" },
      { status: 400 }
    );
  }

  // HEAD request to validate Content-Type
  try {
    const headRes = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });

    if (!headRes.ok) {
      return NextResponse.json(
        { error: `URL returned status ${headRes.status}` },
        { status: 400 }
      );
    }

    const contentType = headRes.headers.get("content-type") || "";
    const contentLength = headRes.headers.get("content-length");

    const isMP4 = contentType.includes("video/mp4") || contentType.includes("application/octet-stream");

    if (!isMP4 && contentType && !contentType.includes("video/")) {
      return NextResponse.json(
        { error: `URL does not appear to be a video file (Content-Type: ${contentType})` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      url,
      contentType,
      sizeBytes: contentLength ? parseInt(contentLength) : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach URL. Please check the link and try again." },
      { status: 400 }
    );
  }
}
