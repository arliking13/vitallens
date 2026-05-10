import type {
  WellnessReportInput,
  WellnessSummaryResponse,
} from "@/shared/types/check-flow";

export const runtime = "nodejs";

const DEFAULT_WATSONX_VERSION = "2024-03-14";
const DEFAULT_WATSONX_MODEL_ID = "ibm/granite-3-8b-instruct";
const WATSONX_MAX_NEW_TOKENS = 120;
const WATSONX_ERROR_LOG_LIMIT = 2000;
const IBM_PROJECT_ID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PREFIX_PATTERN = /^[0-9a-f]{8}-/i;
const fallbackSummary: WellnessSummaryResponse = {
  nextStep:
    "Review your local results and repeat the check later if you want another wellness snapshot.",
  observations: [
    "Your pulse estimate and breath motion check are shown locally.",
    "This summary is wellness-only and is not for medical decisions.",
  ],
  source: "fallback",
  summary:
    "AI summary is unavailable right now. Your local pulse and breath results are still shown.",
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
        }
      : null,
    pulse: reportInput.pulse
      ? {
          bpm: reportInput.pulse.bpm,
          confidence: reportInput.pulse.confidence,
          sampleSeconds: reportInput.pulse.sampleSeconds,
          signalLabel: reportInput.pulse.signalLabel,
          source: reportInput.pulse.source,
        }
      : null,
  };
}

function buildPrompt(reportInput: WellnessReportInput) {
  const compactReportInput = buildCompactReportInput(reportInput);

  return [
    "You write concise, safe, wellness-only JSON summaries for VitalLens.",
    "Rules: no diagnosis, treatment advice, clinical accuracy claims, medical conditions, or normal/abnormal labels.",
    "Use only this structured data. Mention pulse estimate and breath motion check when present.",
    'Return JSON only: {"summary":"1 short sentence","observations":["short point 1","short point 2"],"nextStep":"1 short safe next step"}.',
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

function parseSummary(generatedText: string): WellnessSummaryResponse {
  const jsonStart = generatedText.indexOf("{");
  const jsonEnd = generatedText.lastIndexOf("}");
  const jsonText =
    jsonStart >= 0 && jsonEnd > jsonStart
      ? generatedText.slice(jsonStart, jsonEnd + 1)
      : generatedText;
  const parsed = JSON.parse(jsonText) as Partial<WellnessSummaryResponse>;

  return {
    nextStep:
      typeof parsed.nextStep === "string" && parsed.nextStep
        ? parsed.nextStep
        : fallbackSummary.nextStep,
    observations: Array.isArray(parsed.observations)
      ? parsed.observations
          .filter((observation): observation is string =>
            typeof observation === "string",
          )
          .slice(0, 3)
      : fallbackSummary.observations,
    source: "ibm-watsonx",
    summary:
      typeof parsed.summary === "string" && parsed.summary
        ? parsed.summary
        : fallbackSummary.summary,
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

    return Response.json(parseSummary(generatedText));
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
