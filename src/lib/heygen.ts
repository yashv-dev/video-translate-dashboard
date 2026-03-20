const HEYGEN_API_URL = "https://api.heygen.com";

export async function submitTranslationJob(params: {
  videoUrl: string;
  targetLanguage: string;
  lipSync: boolean;
}): Promise<{ jobId: string }> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured");
  }

  const res = await fetch(`${HEYGEN_API_URL}/v2/video_translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      video_url: params.videoUrl,
      output_language: mapLanguageCode(params.targetLanguage),
      translate_audio_only: !params.lipSync,
      mode: "quality",
      enable_dynamic_duration: "true",
      keep_the_same_format: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`HeyGen API error (${res.status}): ${errText}`);
    throw new Error("Translation service error. Please try again later.");
  }

  const data = await res.json();
  return { jobId: data.data?.video_translate_id || data.data?.id || data.id };
}

export async function checkJobStatus(jobId: string): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
  error?: string;
  progress?: number;
}> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured");
  }

  const res = await fetch(`${HEYGEN_API_URL}/v2/video_translate/${jobId}`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`HeyGen status check error (${res.status}): ${errText}`);
    throw new Error("Translation service error. Please try again later.");
  }

  const data = await res.json();
  console.log(`[HeyGen] Raw status response for job ${jobId}:`, JSON.stringify(data));
  const heygenStatus = data.data?.status || data.status;
  const progress = typeof data.data?.progress === "number" ? data.data.progress : undefined;

  if (heygenStatus === "completed" || heygenStatus === "success") {
    return {
      status: "completed",
      outputUrl: data.data?.url || data.data?.output_url,
      progress: 100,
    };
  }

  if (heygenStatus === "failed" || heygenStatus === "error") {
    return {
      status: "failed",
      error: data.data?.error || data.data?.message || "Translation failed",
      progress,
    };
  }

  if (heygenStatus === "processing" || heygenStatus === "running") {
    return { status: "processing", progress };
  }

  return { status: "pending", progress };
}

// Map UI language names to HeyGen's expected language names
// HeyGen v2 API accepts full language names (not ISO codes)
function mapLanguageCode(language: string): string {
  const languageMap: Record<string, string> = {
    "Arabic": "Arabic",
    "Bengali": "Bengali (India)",
    "Chinese (Mandarin)": "Chinese (Mandarin, Simplified)",
    "Czech": "Czech",
    "Danish": "Danish",
    "Dutch": "Dutch",
    "English": "English",
    "Filipino": "Filipino",
    "Finnish": "Finnish",
    "French": "French",
    "German": "German",
    "Greek": "Greek",
    "Gujarati": "Gujarati (India)",
    "Hebrew": "Hebrew (Israel)",
    "Hindi": "Hindi",
    "Hungarian": "Hungarian (Hungary)",
    "Indonesian": "Indonesian",
    "Italian": "Italian",
    "Japanese": "Japanese",
    "Kannada": "Kannada (India)",
    "Korean": "Korean",
    "Malay": "Malay",
    "Malayalam": "Malayalam (India)",
    "Marathi": "Marathi (India)",
    "Norwegian": "Norwegian Bokmål (Norway)",
    "Polish": "Polish",
    "Portuguese": "Portuguese",
    "Punjabi": "Punjabi",
    "Romanian": "Romanian",
    "Russian": "Russian",
    "Slovak": "Slovak",
    "Spanish": "Spanish",
    "Swedish": "Swedish",
    "Tamil": "Tamil (India)",
    "Telugu": "Telugu (India)",
    "Thai": "Thai (Thailand)",
    "Turkish": "Turkish",
    "Ukrainian": "Ukrainian",
    "Urdu": "Urdu (Pakistan)",
    "Vietnamese": "Vietnamese",
  };

  return languageMap[language] || language;
}
