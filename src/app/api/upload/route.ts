import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { uploadToS3 } from "@/lib/s3";

const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB || "500") * 1024 * 1024;
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".mp4")) {
    return NextResponse.json(
      { error: "Only MP4 files are allowed. Please upload a .mp4 file." },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (file.type !== "video/mp4") {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Only video/mp4 is accepted.` },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = MAX_FILE_SIZE / (1024 * 1024);
    return NextResponse.json(
      { error: `File too large. Maximum size is ${maxMB}MB.` },
      { status: 400 }
    );
  }

  // Ensure uploads directory exists
  await mkdir(UPLOADS_DIR, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name);
  const uniqueName = `${randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);

  // Write file to disk
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  // Upload to S3 for public access (bucket is public, HeyGen needs a publicly accessible URL)
  let publicUrl = `/uploads/${uniqueName}`;
  try {
    const s3Key = `uploads/${uniqueName}`;
    await uploadToS3({ key: s3Key, body: buffer, contentType: "video/mp4" });
    const bucket = process.env.S3_BUCKET || "test-public-stage-dubbing";
    const prefix = process.env.S3_PREFIX || "heygenDub/";
    const region = process.env.AWS_REGION || "us-east-1";
    publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${prefix}${s3Key}`;
  } catch (err) {
    console.error("S3 upload failed, falling back to local path:", err);
  }

  return NextResponse.json({
    success: true,
    fileName: file.name,
    storedName: uniqueName,
    filePath: publicUrl,
    sizeBytes: file.size,
    mimeType: file.type,
  });
}
