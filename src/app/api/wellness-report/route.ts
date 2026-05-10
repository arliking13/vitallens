import type {
  WellnessReportInput,
  WellnessSummaryResponse,
} from "@/shared/types/check-flow";

export const runtime = "nodejs";

const DEFAULT_WATSONX_VERSION = "2024-03-14";
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

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getWatsonxConfig() {
  const apiKey = getEnvValue("IBM_WATSONX_API_KEY", "WATSONX_API_KEY");
  const endpoint = getEnvValue(
    "IBM_WATSONX_URL",
    "IBM_WATSONX_ENDPOINT",
    "WATSONX_URL",
    "WATSONX_ENDPOINT",
  );
  const modelId = getEnvValue("IBM_WATSONX_MODEL_ID", "WATSONX_MODEL_ID");
  const projectId = getEnvValue(
    "IBM_WATSONX_PROJECT_ID",
    "WATSONX_PROJECT_ID",
  );
  const version =
    getEnvValue("IBM_WATSONX_VERSION", "WATSONX_VERSION") ??
    DEFAULT_WATSONX_VERSION;

  if (!apiKey || !endpoint || !modelId || !projectId) {
    return null;
  }

  return {
    apiKey,
    endpoint,
    modelId,
    projectId,
    version,
  };
}

function buildWatsonxChatUrl(endpoint: string, version: string) {
  const trimmedEndpoint = endpoint.replace(/\/+$/, "");
  const mlBase = trimmedEndpoint.endsWith("/ml/v1")
    ? trimmedEndpoint
    : `${trimmedEndpoint}/ml/v1`;

  return `${mlBase}/text/chat?version=${encodeURIComponent(version)}`;
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

  if (!response.ok) {
    throw new Error("IBM IAM token request failed.");
  }

  const tokenResponse = (await response.json()) as { access_token?: unknown };

  if (typeof tokenResponse.access_token !== "string") {
    throw new Error("IBM IAM token response was missing an access token.");
  }

  return tokenResponse.access_token;
}

function buildPrompt(reportInput: WellnessReportInput) {
  return [
    "Generate a short wellness-only check-in summary from this structured VitalLens data.",
    "Do not diagnose. Do not provide treatment advice. Do not claim clinical accuracy.",
    "Do not mention medical conditions. Do not classify results as normal or abnormal.",
    "Use calm, simple language.",
    "Mention that the result is based on a pulse estimate and breath motion check when both are present.",
    "Return only JSON with keys: summary, observations, nextStep.",
    "",
    JSON.stringify(reportInput, null, 2),
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

  const config = getWatsonxConfig();

  if (!config) {
    return Response.json(fallbackSummary);
  }

  try {
    const accessToken = await getIamAccessToken(config.apiKey);
    const response = await fetch(
      buildWatsonxChatUrl(config.endpoint, config.version),
      {
        body: JSON.stringify({
          max_tokens: 220,
          messages: [
            {
              content:
                "You write concise, safe, wellness-only summaries for a browser wellness check-in.",
              role: "system",
            },
            {
              content: buildPrompt(reportInput),
              role: "user",
            },
          ],
          model_id: config.modelId,
          project_id: config.projectId,
          response_format: {
            type: "json_object",
          },
          temperature: 0.2,
          time_limit: 4000,
        }),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error("IBM watsonx request failed.");
    }

    const watsonxResponse = (await response.json()) as WatsonxChatResponse;
    const generatedText = extractGeneratedText(watsonxResponse);

    if (!generatedText) {
      throw new Error("IBM watsonx response did not include generated text.");
    }

    return Response.json(parseSummary(generatedText));
  } catch {
    return Response.json(fallbackSummary);
  }
}
