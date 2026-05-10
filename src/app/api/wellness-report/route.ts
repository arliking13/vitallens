import type {
  WellnessReportInput,
  WellnessSummaryResponse,
} from "@/shared/types/check-flow";

export const runtime = "nodejs";

const DEFAULT_WATSONX_VERSION = "2024-03-14";
const DEFAULT_WATSONX_MODEL_ID =
  "mistralai/mistral-small-3-1-24b-instruct-2503";
const WATSONX_MAX_NEW_TOKENS = 120;
const WATSONX_ERROR_LOG_LIMIT = 2000;
const TELEMETRY_MAX_POINTS = 80;
const IBM_PROJECT_ID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PREFIX_PATTERN = /^[0-9a-f]{8}-/i;
const unsafeReportTerms = [
  "abnormal",
  "clinical",
  "condition",
  "diagnosis",
  "disease",
  "healthy",
  "medical advice",
  "normal",
  "risk",
  "treatment",
  "unhealthy",
];
const fallbackSummary: WellnessSummaryResponse = {
  nextStep:
    "Use the local results as a wellness snapshot and repeat the check later if needed.",
  observations: [
    "Pulse and breath results are still shown locally.",
    "The AI summary can be regenerated after the service is available.",
    "The local results remain a wellness-only snapshot.",
  ],
  source: "fallback",
  summary:
    "Your local pulse and breath motion results are available, but the IBM summary could not be generated right now.",
};

type WatsonxChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  results?: Array<{
    generated_text?: unknown;
  }>;
};

type WatsonxEnvStatus = {
  hasApiKey: boolean;
  hasEndpoint: boolean;
  hasModelId: boolean;
  hasProjectId: boolean;
  hasVersionOverride: boolean;
  usingDefaultModelId: boolean;
};

type WatsonxConfig = {
  apiKey: string;
  endpoint: string;
  envStatus: WatsonxEnvStatus;
  modelId: string;
  projectId: string;
  version: string;
};

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getWatsonxConfig(): {
  config: WatsonxConfig | null;
  envStatus: WatsonxEnvStatus;
} {
  const apiKey = getEnvValue("IBM_WATSONX_API_KEY", "WATSONX_API_KEY");
  const endpoint = getEnvValue(
    "IBM_WATSONX_URL",
    "IBM_WATSONX_ENDPOINT",
    "WATSONX_URL",
    "WATSONX_ENDPOINT",
  );
  const modelIdFromEnv = getEnvValue(
    "IBM_WATSONX_MODEL_ID",
    "WATSONX_MODEL_ID",
  );
  const projectId = getEnvValue(
    "IBM_WATSONX_PROJECT_ID",
    "WATSONX_PROJECT_ID",
  );
  const versionFromEnv = getEnvValue("IBM_WATSONX_VERSION", "WATSONX_VERSION");
  const modelId = modelIdFromEnv ?? DEFAULT_WATSONX_MODEL_ID;
  const version = versionFromEnv ?? DEFAULT_WATSONX_VERSION;
  const envStatus = {
    hasApiKey: Boolean(apiKey),
    hasEndpoint: Boolean(endpoint),
    hasModelId: Boolean(modelIdFromEnv),
    hasProjectId: Boolean(projectId),
    hasVersionOverride: Boolean(versionFromEnv),
    usingDefaultModelId: !modelIdFromEnv,
  };

  if (!apiKey || !endpoint || !projectId) {
    return {
      config: null,
      envStatus,
    };
  }

  return {
    config: {
      apiKey,
      endpoint,
      envStatus,
      modelId,
      projectId,
      version,
    },
    envStatus,
  };
}

function buildWatsonxGenerationUrl(endpoint: string, version: string) {
  const trimmedEndpoint = endpoint.replace(/\/+$/, "");
  const mlBase = trimmedEndpoint.endsWith("/ml/v1")
    ? trimmedEndpoint
    : `${trimmedEndpoint}/ml/v1`;

  return `${mlBase}/text/generation?version=${encodeURIComponent(version)}`;
}

function validateWatsonxRequestConfig(config: WatsonxConfig) {
  if (!IBM_PROJECT_ID_V4_PATTERN.test(config.projectId)) {
    throw new Error(
      `Invalid IBM_WATSONX_PROJECT_ID format: ${config.projectId}`,
    );
  }

  if (UUID_PREFIX_PATTERN.test(config.modelId)) {
    throw new Error(
      `IBM_WATSONX_MODEL_ID looks like a project id: ${config.modelId}`,
    );
  }
}

function truncateForServerLog(value: string) {
  return value.length > WATSONX_ERROR_LOG_LIMIT
    ? `${value.slice(0, WATSONX_ERROR_LOG_LIMIT)}...`
    : value;
}

function roundTelemetryNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(3))
    : undefined;
}

function compactTelemetrySeries(values: unknown) {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const finiteValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (finiteValues.length === 0) {
    return undefined;
  }

  if (finiteValues.length <= TELEMETRY_MAX_POINTS) {
    return finiteValues.map((value) => Number(value.toFixed(3)));
  }

  const step = (finiteValues.length - 1) / (TELEMETRY_MAX_POINTS - 1);

  return Array.from({ length: TELEMETRY_MAX_POINTS }, (_, index) =>
    Number(
      (finiteValues[Math.round(index * step)] ?? finiteValues.at(-1) ?? 0)
        .toFixed(3),
    ),
  );
}

function compactPulseTelemetry(
  telemetry: NonNullable<WellnessReportInput["pulse"]>["telemetry"],
) {
  if (!telemetry) {
    return undefined;
  }

  return {
    cleanWindowDurationMs: roundTelemetryNumber(
      telemetry.cleanWindowDurationMs,
    ),
    confidence: telemetry.confidence,
    estimatedBpm: roundTelemetryNumber(telemetry.estimatedBpm),
    sampleCount: roundTelemetryNumber(telemetry.sampleCount),
    sampleDurationMs: roundTelemetryNumber(telemetry.sampleDurationMs),
    signal: compactTelemetrySeries(telemetry.signal),
    signalMax: roundTelemetryNumber(telemetry.signalMax),
    signalMean: roundTelemetryNumber(telemetry.signalMean),
    signalMin: roundTelemetryNumber(telemetry.signalMin),
    signalQuality: telemetry.signalQuality,
    signalRange: roundTelemetryNumber(telemetry.signalRange),
    signalStdDev: roundTelemetryNumber(telemetry.signalStdDev),
    smoothedSignal: compactTelemetrySeries(telemetry.smoothedSignal),
  };
}

function compactBreathTelemetry(
  telemetry: NonNullable<WellnessReportInput["breath"]>["telemetry"],
) {
  if (!telemetry) {
    return undefined;
  }

  return {
    motionMagnitude: compactTelemetrySeries(telemetry.motionMagnitude),
    motionMax: roundTelemetryNumber(telemetry.motionMax),
    motionMean: roundTelemetryNumber(telemetry.motionMean),
    motionMin: roundTelemetryNumber(telemetry.motionMin),
    motionRange: roundTelemetryNumber(telemetry.motionRange),
    motionStdDev: roundTelemetryNumber(telemetry.motionStdDev),
    motionX: compactTelemetrySeries(telemetry.motionX),
    motionY: compactTelemetrySeries(telemetry.motionY),
    motionZ: compactTelemetrySeries(telemetry.motionZ),
    quality: telemetry.quality,
    rhythm: telemetry.rhythm,
    sampleCount: roundTelemetryNumber(telemetry.sampleCount),
    sampleDurationMs: roundTelemetryNumber(telemetry.sampleDurationMs),
  };
}

async function getIamAccessToken(apiKey: string) {
  const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
    body: new URLSearchParams({
      apikey: apiKey,
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const responseText = await response.text();

  if (!response.ok) {
    console.error("[wellness-report] IBM IAM token request failed", {
      responseText: truncateForServerLog(responseText),
      status: response.status,
    });
    throw new Error("IBM IAM token request failed.");
  }

  const tokenResponse = JSON.parse(responseText) as { access_token?: unknown };

  if (typeof tokenResponse.access_token !== "string") {
    throw new Error("IBM IAM token response was missing an access token.");
  }

  return tokenResponse.access_token;
}

function buildCompactReportInput(reportInput: WellnessReportInput) {
  return {
    breath: reportInput.breath
      ? {
          motionLabel: reportInput.breath.motionLabel,
          qualityLabel: reportInput.breath.qualityLabel,
          rhythmLabel: reportInput.breath.rhythmLabel,
          sampleSeconds: reportInput.breath.sampleSeconds,
          source: reportInput.breath.source,
          telemetry: compactBreathTelemetry(reportInput.breath.telemetry),
        }
      : null,
    pulse: reportInput.pulse
      ? {
          bpm: reportInput.pulse.bpm,
          confidence: reportInput.pulse.confidence,
          sampleSeconds: reportInput.pulse.sampleSeconds,
          signalLabel: reportInput.pulse.signalLabel,
          source: reportInput.pulse.source,
          telemetry: compactPulseTelemetry(reportInput.pulse.telemetry),
        }
      : null,
  };
}

function buildPrompt(reportInput: WellnessReportInput) {
  const compactReportInput = buildCompactReportInput(reportInput);

  return [
    "Write a concise wellness report for VitalLens using only this structured phone-sensor data and compact telemetry.",
    "VitalLens is not a medical device. Do not diagnose, advise treatment, claim clinical accuracy, mention medical conditions, or use normal/abnormal/healthy/risk/disease.",
    "Use the telemetry patterns and stats to interpret reliability, consistency, and session quality. Do not simply repeat the final labels or values.",
    "Comment on pulse signal reliability, breath motion consistency, whether this session is usable as a wellness snapshot, what may have reduced confidence, and one practical way to repeat the check more cleanly.",
    "Return ONLY valid JSON. No markdown. No code fences. No comments. No trailing text.",
    "Use double quotes only. Do not include unescaped line breaks inside string values. Keep strings short.",
    'Use exactly this JSON shape: {"summary":"string","observations":["string","string","string"],"nextStep":"string"}',
    "summary: max 2 short sentences interpreting the quality of this phone-based wellness snapshot.",
    "observations: exactly 3 strings labelled Pulse signal:, Breath motion:, Session quality:. Keep each observation short and confidence-aware.",
    "nextStep: exactly 1 sentence with one specific practical suggestion for a cleaner repeat check. Do not say Continue monitoring as needed.",
    `Data: ${JSON.stringify(compactReportInput)}`,
  ].join("\n");
}

function extractGeneratedText(response: WatsonxChatResponse) {
  const chatContent = response.choices?.[0]?.message?.content;

  if (typeof chatContent === "string") {
    return chatContent;
  }

  if (Array.isArray(chatContent)) {
    const textParts = chatContent
      .map((part) =>
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
          ? part.text
          : "",
      )
      .filter(Boolean);

    if (textParts.length > 0) {
      return textParts.join("\n");
    }
  }

  const generatedText = response.results?.[0]?.generated_text;
  return typeof generatedText === "string" ? generatedText : null;
}

function stripMarkdownFences(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(text: string) {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1);
  }

  return text;
}

function safeParseWatsonxReport(text: string) {
  const trimmedText = text.trim();
  const withoutFences = stripMarkdownFences(trimmedText);
  const candidates = [
    trimmedText,
    withoutFences,
    extractJsonObject(withoutFences),
  ].filter((candidate, index, allCandidates) => {
    return candidate.length > 0 && allCandidates.indexOf(candidate) === index;
  });

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Partial<WellnessSummaryResponse>;
    } catch {
      // Try the next cleaned candidate before falling back to raw text handling.
    }
  }

  return null;
}

function hasUnsafeReportTerms(value: string) {
  const lowerValue = value.toLowerCase();
  return unsafeReportTerms.some((term) => lowerValue.includes(term));
}

function cleanGeneratedText(value: string) {
  return stripMarkdownFences(value)
    .replace(/[{}\[\]",]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(value: string) {
  return (
    cleanGeneratedText(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []
  )
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) => sentence.length > 0 && !hasUnsafeReportTerms(sentence),
    );
}

function limitSentence(value: string, maxLength = 180) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, maxLength - 1).trimEnd()}.`;
}

function getPulseSignalObservation(reportInput: WellnessReportInput) {
  const pulse = reportInput.pulse;

  if (!pulse) {
    return "Pulse signal: pulse data was not included in this report.";
  }

  const sampleText =
    pulse.sampleSeconds !== null ? `${pulse.sampleSeconds}-second` : "clean";
  const variationText =
    typeof pulse.telemetry?.signalStdDev === "number"
      ? ` Waveform variation was ${pulse.telemetry.signalStdDev}.`
      : "";

  return `Pulse signal: the ${sampleText} finger-camera sample produced a ${pulse.confidence} confidence estimate with ${pulse.signalLabel.toLowerCase()} signal.${variationText}`;
}

function getBreathMotionObservation(reportInput: WellnessReportInput) {
  const breath = reportInput.breath;

  if (!breath) {
    return "Breath motion: breath motion data was not included in this report.";
  }

  const variationText =
    typeof breath.telemetry?.motionStdDev === "number"
      ? ` Motion variation was ${breath.telemetry.motionStdDev}.`
      : "";

  return `Breath motion: ${breath.motionLabel.toLowerCase()} phone motion with ${breath.rhythmLabel.toLowerCase()} rhythm over ${breath.sampleSeconds} seconds.${variationText}`;
}

function getSessionQualityObservation(reportInput: WellnessReportInput) {
  const pulseQuality = reportInput.pulse?.confidence ?? "missing";
  const breathQuality = reportInput.breath?.qualityLabel ?? "missing";

  return `Session quality: pulse confidence was ${pulseQuality} and breath motion quality was ${breathQuality}, so use this as a wellness-only snapshot.`;
}

function buildSummaryFromRawText(
  generatedText: string,
  reportInput: WellnessReportInput,
): WellnessSummaryResponse {
  const sentences = splitSentences(generatedText);
  const summary =
    sentences.length > 0
      ? sentences.slice(0, 2).map((sentence) => limitSentence(sentence)).join(" ")
      : "VitalLens received a phone-based wellness snapshot from the available pulse and breath checks. This summary is not for medical decisions.";

  return {
    nextStep:
      "Repeat the check while seated, with your finger and phone held still for a cleaner comparison snapshot.",
    observations: [
      getPulseSignalObservation(reportInput),
      getBreathMotionObservation(reportInput),
      getSessionQualityObservation(reportInput),
    ].map((observation) => limitSentence(observation, 220)),
    source: "ibm-watsonx",
    summary,
  };
}

function parseSummary(
  generatedText: string,
  reportInput: WellnessReportInput,
): WellnessSummaryResponse {
  const parsed = safeParseWatsonxReport(generatedText);

  if (!parsed) {
    console.warn(
      "[wellness-report] Watsonx output was not valid JSON; using raw text recovery.",
    );
    return buildSummaryFromRawText(generatedText, reportInput);
  }

  const parsedObservations = Array.isArray(parsed.observations)
    ? parsed.observations.filter(
        (observation): observation is string =>
          typeof observation === "string" &&
          observation.length > 0 &&
          !hasUnsafeReportTerms(observation),
      )
    : [];
  const observations = [...parsedObservations, ...fallbackSummary.observations]
    .slice(0, 3);
  const summary =
    typeof parsed.summary === "string" &&
    parsed.summary &&
    !hasUnsafeReportTerms(parsed.summary)
      ? parsed.summary
      : buildSummaryFromRawText(generatedText, reportInput).summary;
  const nextStep =
    typeof parsed.nextStep === "string" &&
    parsed.nextStep &&
    !hasUnsafeReportTerms(parsed.nextStep)
      ? parsed.nextStep
      : buildSummaryFromRawText(generatedText, reportInput).nextStep;

  return {
    nextStep,
    observations,
    source: "ibm-watsonx",
    summary,
  };
}

export async function POST(request: Request) {
  let reportInput: WellnessReportInput;

  try {
    reportInput = (await request.json()) as WellnessReportInput;
  } catch {
    return Response.json(
      {
        ...fallbackSummary,
        summary: "The report request could not be read.",
      },
      { status: 400 },
    );
  }

  const { config, envStatus } = getWatsonxConfig();

  if (!config) {
    console.warn("[wellness-report] IBM watsonx config missing", {
      env: envStatus,
    });

    return Response.json(fallbackSummary);
  }

  try {
    validateWatsonxRequestConfig(config);
    console.log("[wellness-report] watsonx request config", {
      endpoint: config.endpoint,
      modelId: config.modelId,
      projectId: config.projectId,
      version: config.version,
    });

    const accessToken = await getIamAccessToken(config.apiKey);
    const watsonxRequestBody = {
      input: buildPrompt(reportInput),
      model_id: config.modelId,
      parameters: {
        decoding_method: "greedy",
        max_new_tokens: WATSONX_MAX_NEW_TOKENS,
        min_new_tokens: 20,
        temperature: 0,
      },
      project_id: config.projectId,
    };
    const response = await fetch(
      buildWatsonxGenerationUrl(config.endpoint, config.version),
      {
        body: JSON.stringify(watsonxRequestBody),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("[wellness-report] IBM watsonx text/generation failed", {
        body: errorText,
        status: response.status,
        statusText: response.statusText,
      });

      throw new Error(
        `IBM watsonx request failed: ${response.status} ${response.statusText}`,
      );
    }

    const responseText = await response.text();
    const watsonxResponse = JSON.parse(responseText) as WatsonxChatResponse;
    const generatedText = extractGeneratedText(watsonxResponse);

    if (!generatedText) {
      throw new Error("IBM watsonx response did not include generated text.");
    }

    console.info("[wellness-report] raw watsonx output", generatedText);

    return Response.json(parseSummary(generatedText, reportInput));
  } catch (error) {
    console.error("[wellness-report] Returning fallback summary", {
      env: {
        hasApiKey: Boolean(config?.apiKey),
        hasEndpoint: Boolean(config?.endpoint),
        hasModelId: Boolean(config?.modelId),
        hasProjectId: Boolean(config?.projectId),
        hasVersionOverride: Boolean(process.env.IBM_WATSONX_VERSION),
        usingDefaultModelId:
          !process.env.IBM_WATSONX_MODEL_ID &&
          !process.env.WATSONX_MODEL_ID,
      },
      message: error instanceof Error ? error.message : "Unknown IBM error",
    });

    return Response.json(fallbackSummary);
  }
}
