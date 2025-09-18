import DocumentIntelligence, {
  AnalyzeBatchDocumentsDefaultResponse,
  AnalyzeBatchDocumentsLogicalResponse,
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import {
  TextAnalyticsClient,
  AzureKeyCredential,
} from "@azure/ai-text-analytics";
import { DefaultAzureCredential } from "@azure/identity";
import * as dotenv from "dotenv";
import {
  fastify,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  RouteShorthandOptions,
} from "fastify";
import fp from "fastify-plugin";
import fs from "fs/promises";
import { IncomingMessage, Server, ServerResponse } from "http";
import path from "path";
import cors from "@fastify/cors";
import { AzureOpenAI } from "openai";

// Load environment variables from .env file
dotenv.config();

// Extend FastifyRequest interface to include DIClient and analyzeBase64document
declare module "fastify" {
  interface FastifyRequest {
    DIClient: typeof DIClient;
    analyzeBase64document: typeof analyzeBase64document;
    summarizeByText: typeof summarizeByText;
  }
}

const DIClient = DocumentIntelligence(
  process.env["DOCUMENT_INTELLIGENCE_ENDPOINT"] as string,
  new DefaultAzureCredential()
);

const endpoint = process.env["AZURE_OPENAI_ENDPOINT"] || "";
const apiVersion = "2024-04-01-preview";
const deployment = "gpt-5-mini";
const apiKey = process.env["AZURE_OPENAI_API_KEY"] || "";
const modelName = "gpt-5-mini";

const options = { endpoint, apiKey, deployment, apiVersion, modelName };
const client = new AzureOpenAI(options);

function analyzeBase64document(base64Source: string) {
  return DIClient.path(
    "/documentModels/{modelId}:analyze",
    "prebuilt-layout"
  ).post({
    contentType: "application/json",
    body: {
      base64Source,
    },
    queryParameters: { locale: "en-IN" },
  });
}

// Create a http server. We pass the relevant typings for our http version used.
// By passing types we get correctly typed access to the underlying http objects in routes.
// If using http2 we'd pass <http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>
const server: FastifyInstance<Server, IncomingMessage, ServerResponse> =
  fastify({});

server.register(
  fp(async (fastify: FastifyInstance, opts: FastifyPluginOptions) => {
    fastify.decorateRequest("analyzeBase64document", analyzeBase64document);
    fastify.decorateRequest("summarizeByText", summarizeByText);

    const res = await generateVideoJob("The speaker invokes and summons the universal spirits—sought in darkness and light, dwelling in subtle realms and in mountain tops and caves—and commands them by a written charm to rise and appear.");
    console.log({res});
})
);

// Allow CORS from any localhost port
server.register(cors, {
  origin: (origin, cb) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed"), false);
    }
  },
});

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          pong: {
            type: "string",
          },
        },
      },
    },
  },
};

server.get("/ping", opts, (request, reply) => {
  console.log(reply.res); // this is the http.ServerResponse with correct typings!
  reply.code(200).send({ pong: "it worked!" });
});

server.post("/analyze-base64", opts, async (request, reply) => {
  const { documentName, base64Image } = request.body as {
    documentName: string;
    base64Image: string;
  };

  try {
    const initialResponse = await request.analyzeBase64document(base64Image);

    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error;
    }

    const analyzedResponseBody = await processResponsePolling(initialResponse);

    // await fs.mkdir(path.resolve(process.cwd(), ".logs"), { recursive: true });

    // const filepath = path.resolve(process.cwd(), ".logs", "client-result.json");
    // await fs.writeFile(filepath, JSON.stringify(analyzedResponseBody, null, 2));

    reply.code(200);
    reply.header("Content-Type", "application/json");
    console.log({ analyzedResponseBody });
    reply.send(JSON.stringify(analyzedResponseBody));
  } catch (e) {
    e = e ? e : { code: "unexpected" };
    console.log({ e });
    reply.code(500).send(e);
  }
});

// Simple example of accessing an environment variable
server.get("/app-name", (request, reply) => {
  const appName = process.env.APP_NAME || "Default App Name";
  reply.code(200).send({ appName });
});

// POST handler for text summarization
server.post("/summarize-by-text", async (request, reply) => {
  const { text } = request.body as {
    text: string;
  };

  try {
    // Validate input
    if (!text || typeof text !== "string") {
      return reply.code(400).send({
        error: "Invalid input: text field is required and must be a string",
      });
    }

    const result = await request.summarizeByText(text);

    reply.code(200).send({result});
  } catch (e) {
    console.log({ error: e });
    reply.code(500).send({
      error: "Internal server error during text summarization",
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
});

// Run the server!
const port = parseInt(process.env.PORT || "3333", 10);
server.listen({ port }, function (err, address) {
  if (err) {
    server.log.error(err);
    console.log({ err });
    process.exit(1);
  }
  console.log(`Server is now listening on port ${address}`);
});
async function processResponsePolling(initialResponse) {
  const poller = getLongRunningPoller(DIClient, initialResponse);
  const result = await poller.pollUntilDone();
  const analyzedResponseBody = (result as AnalyzeBatchDocumentsDefaultResponse)
    ?.body;

  if (
    result.status !== "200" ||
    !analyzedResponseBody ||
    analyzedResponseBody.status !== "succeeded"
  ) {
    console.log("Result error");
    throw new Error(`Unexpected status code: ${result.status}`);
  }
  return analyzedResponseBody;
}

const summarizeByText = async (text: string) => {
  const response = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are summarizing text. You are only summarizing text. Return a summary in a plain text format.",
      },
      { role: "user", content: text },
    ],
    max_completion_tokens: 16384,
    model: modelName,
  });

  if (response?.error !== undefined && response.status !== "200") {
    throw response.error;
  }

  return response.choices[0].message.content;
};


/**
 * curl -X POST "URLHERE" \
  -H "Content-Type: application/json" \
  -H "Api-key: xyz" \
  -d '{
     "model": "sora",
     "prompt" : "The speaker invokes and summons the universal spirits—sought in darkness and light, dwelling in subtle realms and in mountain tops and caves—and commands them by a written charm to rise and appear.",
     "height" : "1080",
     "width" : "1080",
     "n_seconds" : "5",
     "n_variants" : "1"
    }'
 */
async function generateVideoJob(prompt: string) {
    const endpoint =
        process.env["SORA_OPENAI_ENDPOINT"];
    const apiKey = process.env["AZURE_OPENAI_API_KEY"];
    const body = {
        model: "sora",
        prompt,
        height: "1080",
        width: "1080",
        n_seconds: "5",
        n_variants: "1",
    };

    const response = await fetch(endpoint as string, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Api-key": apiKey as string,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${await response.text()}`);
    }

    return await response.json();
}