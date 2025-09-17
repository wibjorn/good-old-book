import DocumentIntelligence, {
    AnalyzeBatchDocumentsDefaultResponse,
  AnalyzeBatchDocumentsLogicalResponse,
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
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

// Load environment variables from .env file
dotenv.config();

// Extend FastifyRequest interface to include DIClient and analyzeBase64document
declare module "fastify" {
  interface FastifyRequest {
    DIClient: typeof client;
    analyzeBase64document: typeof analyzeBase64document;
  }
}

const client = DocumentIntelligence(
  process.env["DOCUMENT_INTELLIGENCE_ENDPOINT"] as string,
  new DefaultAzureCredential()
);

function analyzeBase64document(base64Source: string) {
  return client
    .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
    .post({
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
    reply.header('Content-Type', 'application/json')
    console.log({analyzedResponseBody})
    reply.send(JSON.stringify(analyzedResponseBody));
  } catch (e) {
      e = e ? e : { code: 'unexpected' };
      console.log({e})
    reply.code(500).send(e);
  }
  
});

// Simple example of accessing an environment variable
server.get("/app-name", (request, reply) => {
  const appName = process.env.APP_NAME || "Default App Name";
  reply.code(200).send({ appName });
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
    const poller = getLongRunningPoller(client, initialResponse);
    const result = await poller.pollUntilDone();
    const analyzedResponseBody = (result as AnalyzeBatchDocumentsDefaultResponse)?.body;

    if (result.status !== '200' || !analyzedResponseBody || analyzedResponseBody.status !== 'succeeded') {
        console.log('Result error');
        throw new Error(`Unexpected status code: ${result.status}`);
    }
    return analyzedResponseBody;
}

