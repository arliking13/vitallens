# IBM watsonx Setup

VitalLens uses IBM watsonx from a server-side Next.js API route to generate a short wellness-only report summary. Local Pulse and Breath results still work when IBM is not configured.

## Required Environment Variables

```env
IBM_WATSONX_API_KEY=
IBM_WATSONX_URL=https://ca-tor.ml.cloud.ibm.com
IBM_WATSONX_MODEL_ID=mistralai/mistral-small-3-1-24b-instruct-2503
IBM_WATSONX_PROJECT_ID=
IBM_WATSONX_VERSION=2024-03-14
```

Do not commit `.env.local`.

## Setup Steps

1. Create an IBM Cloud account.
2. Create or open a watsonx.ai project.
3. Copy the project ID from the watsonx.ai project settings.
4. Create an IBM Cloud API key or a Service ID API key with access to the project.
5. Choose the watsonx endpoint for the region where the project and model are available.
6. Choose an available instruct model for that region.
7. Add the variables to `.env.local` for local development.
8. Add the same variables in Vercel Project Settings -> Environment Variables.
9. Redeploy the Vercel project after changing environment variables.

## Toronto Endpoint

For the current Toronto endpoint:

```text
https://ca-tor.ml.cloud.ibm.com
```

The working model currently used by VitalLens is:

```text
mistralai/mistral-small-3-1-24b-instruct-2503
```

Model availability can vary by region and over time. If the API returns a model-not-found or model-not-supported error, query available models for the selected region and update `IBM_WATSONX_MODEL_ID`.

## API Route Behavior

The route at `src/app/api/wellness-report/route.ts`:

- Validates that required env vars exist.
- Requests an IAM access token.
- Sends one non-streaming text generation request.
- Keeps output short with compact token settings.
- Logs safe status information without logging API keys or access tokens.
- Returns fallback text if IBM config or request fails.

## Prompt Safety

The prompt asks watsonx to interpret session quality using structured results and compact telemetry. It also instructs the model to avoid:

- Diagnosis
- Treatment advice
- Normal/abnormal labels
- Healthy/unhealthy claims
- Medical decision guidance
- Clinical accuracy claims

## Troubleshooting

If the IBM card shows fallback text:

1. Check Vercel logs for `[wellness-report]` messages.
2. Confirm the IAM token request succeeds.
3. Confirm the watsonx endpoint matches the project region.
4. Confirm `IBM_WATSONX_PROJECT_ID` is the project ID, not the model ID.
5. Confirm `IBM_WATSONX_MODEL_ID` is available in the selected region.
6. Redeploy after changing env vars.

Never paste API keys into logs, screenshots, public issues, or the README.
