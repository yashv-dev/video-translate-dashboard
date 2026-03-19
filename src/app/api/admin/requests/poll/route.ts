import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkJobStatus } from "@/lib/heygen";
import { uploadToS3 } from "@/lib/s3";
import { randomUUID } from "crypto";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all PROCESSING requests with HeyGen job IDs
  const processingRequests = await prisma.translationRequest.findMany({
    where: { status: "PROCESSING", heygenJobId: { not: null } },
  });

  if (processingRequests.length === 0) {
    return NextResponse.json({ message: "No processing jobs to check", results: [] });
  }

  const results = [];

  for (const req of processingRequests) {
    try {
      const status = await checkJobStatus(req.heygenJobId!);

      if (status.status === "completed" && status.outputUrl) {
        // Download the translated video and upload to S3
        let s3Url: string | null = null;

        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
          try {
            const videoRes = await fetch(status.outputUrl);
            const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
            const s3Key = `${randomUUID()}_${req.targetLanguage.toLowerCase()}.mp4`;
            s3Url = await uploadToS3({ key: s3Key, body: videoBuffer });
          } catch (s3Err) {
            console.error(`S3 upload failed for request ${req.id}:`, s3Err);
            // Fall back to HeyGen URL
          }
        }

        await prisma.translationRequest.update({
          where: { id: req.id },
          data: {
            status: "COMPLETED",
            outputUrl: s3Url || status.outputUrl,
          },
        });

        results.push({ id: req.id, status: "COMPLETED", outputUrl: s3Url || status.outputUrl });
      } else if (status.status === "failed") {
        await prisma.translationRequest.update({
          where: { id: req.id },
          data: { status: "FAILED" },
        });

        results.push({ id: req.id, status: "FAILED", error: status.error });
      } else {
        results.push({ id: req.id, status: status.status });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Mark as FAILED if the job doesn't exist on HeyGen (persistent error)
      await prisma.translationRequest.update({
        where: { id: req.id },
        data: { status: "FAILED" },
      });
      results.push({ id: req.id, status: "FAILED", error: message });
    }
  }

  return NextResponse.json({ results });
}
