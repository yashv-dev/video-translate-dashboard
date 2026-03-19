import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { submitTranslationJob } from "@/lib/heygen";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await request.json();

  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  const translationReq = await prisma.translationRequest.findUnique({
    where: { id: requestId },
  });

  if (!translationReq) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (translationReq.status !== "APPROVED") {
    return NextResponse.json(
      { error: `Cannot process request with status ${translationReq.status}. Must be APPROVED.` },
      { status: 400 }
    );
  }

  if (!process.env.HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY is not configured. Please set it in environment variables." },
      { status: 500 }
    );
  }

  try {
    const { jobId } = await submitTranslationJob({
      videoUrl: translationReq.videoUrl,
      targetLanguage: translationReq.targetLanguage,
      lipSync: translationReq.lipSync,
    });

    await prisma.translationRequest.update({
      where: { id: requestId },
      data: {
        status: "PROCESSING",
        heygenJobId: jobId,
      },
    });

    return NextResponse.json({ success: true, jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit to HeyGen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
