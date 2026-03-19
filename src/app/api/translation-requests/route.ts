import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// HeyGen pricing estimates (per minute of video)
const PRICING = {
  withoutLipSync: 0.5, // $0.50/min
  withLipSync: 1.5, // $1.50/min
};

// Supported target languages for HeyGen video translation
const SUPPORTED_LANGUAGES = [
  "Arabic", "Bengali", "Chinese (Mandarin)", "Czech", "Danish", "Dutch",
  "English", "Filipino", "Finnish", "French", "German", "Greek",
  "Gujarati", "Hebrew", "Hindi", "Hungarian", "Indonesian", "Italian",
  "Japanese", "Kannada", "Korean", "Malay", "Malayalam", "Marathi",
  "Norwegian", "Polish", "Portuguese", "Punjabi", "Romanian", "Russian",
  "Slovak", "Spanish", "Swedish", "Tamil", "Telugu", "Thai",
  "Turkish", "Ukrainian", "Urdu", "Vietnamese",
];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where = isAdmin
    ? status ? { status: status as never } : {}
    : { userId: session.user.id, ...(status ? { status: status as never } : {}) };

  const requests = await prisma.translationRequest.findMany({
    where,
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests, supportedLanguages: SUPPORTED_LANGUAGES, pricing: PRICING });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { videoUrl, sourceFileName, fileSizeBytes, targetLanguage, lipSync, durationSeconds } = body;

  if (!videoUrl) {
    return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
  }

  if (!targetLanguage) {
    return NextResponse.json({ error: "Target language is required" }, { status: 400 });
  }

  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    return NextResponse.json({ error: `Unsupported language: ${targetLanguage}` }, { status: 400 });
  }

  // Calculate cost estimate
  const duration = durationSeconds || 60; // Default to 1 min if unknown
  const durationMinutes = duration / 60;
  const pricePerMin = lipSync ? PRICING.withLipSync : PRICING.withoutLipSync;
  const costEstimate = Math.round(durationMinutes * pricePerMin * 100) / 100;

  const translationRequest = await prisma.translationRequest.create({
    data: {
      userId: session.user.id,
      videoUrl,
      sourceFileName: sourceFileName || null,
      fileSizeBytes: fileSizeBytes ? parseInt(fileSizeBytes) : null,
      durationSeconds: durationSeconds ? parseFloat(durationSeconds) : null,
      targetLanguage,
      lipSync: lipSync === true,
      costEstimate,
      status: "PENDING_APPROVAL",
    },
  });

  return NextResponse.json({ request: translationRequest }, { status: 201 });
}
