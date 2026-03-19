"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  fileName: string;
  storedName: string;
  filePath: string;
  sizeBytes: number;
  mimeType: string;
};

type UrlValidation = {
  valid: boolean;
  url: string;
  contentType: string;
  sizeBytes: number | null;
};

const SUPPORTED_LANGUAGES = [
  "Arabic", "Bengali", "Chinese (Mandarin)", "Czech", "Danish", "Dutch",
  "English", "Filipino", "Finnish", "French", "German", "Greek",
  "Gujarati", "Hebrew", "Hindi", "Hungarian", "Indonesian", "Italian",
  "Japanese", "Kannada", "Korean", "Malay", "Malayalam", "Marathi",
  "Norwegian", "Polish", "Portuguese", "Punjabi", "Romanian", "Russian",
  "Slovak", "Spanish", "Swedish", "Tamil", "Telugu", "Thai",
  "Turkish", "Ukrainian", "Urdu", "Vietnamese",
];

const PRICING = {
  withoutLipSync: 0.5,
  withLipSync: 1.5,
};

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state: "upload" -> "configure" -> "submitted"
  const [step, setStep] = useState<"upload" | "configure" | "submitted">("upload");

  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL input state
  const [urlInput, setUrlInput] = useState("");
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [urlValidation, setUrlValidation] = useState<UrlValidation | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");

  // Translation request form state
  const [targetLanguage, setTargetLanguage] = useState("");
  const [lipSync, setLipSync] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetState = () => {
    setError(null);
    setUploadResult(null);
    setUrlValidation(null);
    setUploadProgress(0);
    setStep("upload");
    setTargetLanguage("");
    setLipSync(false);
  };

  // Compute video info for the form
  const videoUrl = uploadResult?.filePath || urlValidation?.url || "";
  const fileName = uploadResult?.fileName || (urlValidation?.url ? new URL(urlValidation.url).pathname.split("/").pop() : "");
  const fileSize = uploadResult?.sizeBytes || urlValidation?.sizeBytes || null;

  // Cost estimation
  const estimatedDurationMin = 1; // Default 1 min since we don't have ffprobe
  const pricePerMin = lipSync ? PRICING.withLipSync : PRICING.withoutLipSync;
  const estimatedCost = (estimatedDurationMin * pricePerMin).toFixed(2);

  const validateAndUploadFile = useCallback(async (file: File) => {
    setError(null);
    setUploadResult(null);
    setUrlValidation(null);
    setUploadProgress(0);

    if (!file.name.toLowerCase().endsWith(".mp4")) {
      setError("Only MP4 files are allowed. Please select a .mp4 file.");
      return;
    }

    if (file.type && file.type !== "video/mp4") {
      setError(`Invalid file type: ${file.type}. Only video/mp4 is accepted.`);
      return;
    }

    const maxSizeMB = 500;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum is ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            const errBody = JSON.parse(xhr.responseText);
            reject(new Error(errBody.error || "Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      setUploadResult(result);
      setStep("configure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUploadFile(file);
  }, [validateAndUploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUploadFile(file);
  }, [validateAndUploadFile]);

  const handleValidateUrl = async () => {
    setError(null);
    setUploadResult(null);
    setUrlValidation(null);

    if (!urlInput.trim()) {
      setError("Please enter a URL");
      return;
    }

    setValidatingUrl(true);
    try {
      const res = await fetch("/api/validate-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "URL validation failed");
        return;
      }

      setUrlValidation(data);
      setStep("configure");
    } catch {
      setError("Failed to validate URL");
    } finally {
      setValidatingUrl(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!targetLanguage) {
      setError("Please select a target language");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/translation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          sourceFileName: fileName,
          fileSizeBytes: fileSize,
          targetLanguage,
          lipSync,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit request");
        return;
      }

      setStep("submitted");
    } catch {
      setError("Failed to submit translation request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Step 3: Submission confirmation
  if (step === "submitted") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Video</h1>
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your translation request has been submitted for admin approval.
            You will be notified when it is processed.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/requests")}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              View My Requests
            </button>
            <button
              onClick={resetState}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Configure translation
  if (step === "configure") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Configure Translation</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Video info summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Video</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">File</dt>
            <dd className="text-gray-900 truncate">{fileName}</dd>
            {fileSize && (
              <>
                <dt className="text-gray-500">Size</dt>
                <dd className="text-gray-900">{formatBytes(fileSize)}</dd>
              </>
            )}
            <dt className="text-gray-500">Source</dt>
            <dd className="text-gray-900">{uploadResult ? "Uploaded file" : "URL"}</dd>
          </dl>
        </div>

        {/* Translation options */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Translation Options</h2>

          <div className="space-y-4">
            {/* Target language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Language
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select a language...</option>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Lip sync toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Lip Sync</label>
                <p className="text-xs text-gray-500">Enable lip synchronization for more natural results</p>
              </div>
              <button
                type="button"
                onClick={() => setLipSync(!lipSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  lipSync ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    lipSync ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Cost estimation */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-medium text-yellow-800 mb-3">Estimated Cost</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-yellow-900">${estimatedCost}</span>
            <span className="text-sm text-yellow-700">estimated</span>
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Based on ~{estimatedDurationMin} min video at ${pricePerMin.toFixed(2)}/min
            ({lipSync ? "with" : "without"} lip sync).
            Actual cost may vary based on video duration.
          </p>
        </div>

        {/* Submit buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmitRequest}
            disabled={!targetLanguage || submitting}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting..." : "Submit for Approval"}
          </button>
          <button
            onClick={resetState}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Upload
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Video</h1>

      {/* Tab selector */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => { setActiveTab("upload"); setError(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upload"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          File Upload
        </button>
        <button
          onClick={() => { setActiveTab("url"); setError(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "url"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          URL Input
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File Upload Tab */}
      {activeTab === "upload" && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? "Drop your MP4 file here" : "Drag and drop your MP4 file here"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              or click to browse. Only .mp4 files up to 500MB are accepted.
            </p>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Uploading...</span>
                <span className="text-sm font-medium text-gray-900">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL Input Tab */}
      {activeTab === "url" && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video URL (must be a direct link to an MP4 file)
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <button
              onClick={handleValidateUrl}
              disabled={validatingUrl || !urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {validatingUrl ? "Validating..." : "Validate & Continue"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            The URL must point directly to an .mp4 file and be publicly accessible.
          </p>
        </div>
      )}

      {/* Info panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Supported formats</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- MP4 files only (video/mp4)</li>
          <li>- Maximum file size: 500MB</li>
          <li>- Direct URL links must end in .mp4</li>
        </ul>
      </div>
    </div>
  );
}
