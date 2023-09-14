import { Endpoint, Contract, AxiosRequestObject } from "./types";
import * as https from "https";
import * as http from "http";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3_1 as OpenAPI } from "openapi-types";
import type {
  ChatCompletionCreateParams,
  ChatCompletionMessage,
} from "openai/resources/chat";

/**
 * Chatterbox AI is a tool that allows you to create a chatbot from an OpenAPI specification!
 */
export default class Chatterbox {
  private swaggerDoc: OpenAPI.Document;
  private taggedEndpoints: {
    [formattedName: string]: Endpoint;
  } = {};

  baseUrl?: string;
  functionCalls: ChatCompletionCreateParams.Function[] = [];

  readonly defaultSystemPrompt = `You the front end for an API back end. Interact with the user and when there is a good option for a function to use, please write the function call for that. Please ensure that the responses provided to the user are abstracted from the underlying implementation and technical jargon. Describe functionalities in a user-friendly manner with non-technical speech without code details.`;

  constructor(public tagNames: string[] = []) {}

  /**
   * Fetches the Swagger document and normalizes it using SwaggerParser.
   */
  fetchDoc(swaggerDocUrl: string): Promise<Chatterbox> {
    return new Promise((resolve, reject) => {
      const isHttps = swaggerDocUrl.startsWith("https");
      const httpLib = isHttps ? https : http;

      httpLib
        .get(swaggerDocUrl, async (res) => {
          let rawData = "";

          res.on("data", (chunk) => {
            rawData += chunk;
          });

          res.on("end", async () => {
            try {
              await this.loadDoc(rawData);
              resolve(this);
            } catch (error) {
              reject("Error fetching Swagger document: " + error.message);
            }
          });
        })
        .on("error", (error) => {
          reject(`Got error: ${error.message}`);
        });
    });
  }

  /**
   * Validate the document and parse out some params.
   */
  async loadDoc(swaggerDoc: OpenAPI.Document | string) {
    if (typeof swaggerDoc === "string") {
      swaggerDoc = JSON.parse(swaggerDoc) as OpenAPI.Document;
    }

    this.swaggerDoc = (await SwaggerParser.validate(
      swaggerDoc
    )) as OpenAPI.Document;
    this.getTaggedEndpoints();
    this.baseUrl = this.swaggerDoc.servers[0].url;
    this.getFunctionCalls();
    return this as Chatterbox;
  }

  /**
   * Get the endpoints that have been tagged with the tag names provided.
   */
  private getTaggedEndpoints() {
    const { paths } = this.swaggerDoc;

    for (const path in paths) {
      const pathItem = paths[path];

      for (const method in pathItem) {
        const operation = pathItem[method];
        this.taggedEndpoints[0];

        if (!operation.tags) continue;
        for (const tag of operation.tags) {
          if (this.tagNames.includes(tag) || this.tagNames.length === 0) {
            const formattedName = this.formatName(operation.summary);
            this.taggedEndpoints[formattedName] = {
              [path]: {
                [method]: operation,
              },
            };
          }
        }
      }
    }
    return Object.values(this.taggedEndpoints);
  }

  /**
   * Format into OpenAI Function Call format
   */
  private getFunctionCalls() {
    if (!this.swaggerDoc) {
      throw new Error(
        "No Swagger document found. Please set the Swagger document URL with `ChatterService.swaggerDocUrl` or set the Swagger document manually with `ChatterService.swaggerDoc`"
      );
    }
    const taggedEndpoints = Object.values(this.taggedEndpoints);
    const functionCalls: ChatCompletionCreateParams.Function[] =
      taggedEndpoints.map((endpoint) => {
        const path = Object.keys(endpoint)[0];
        const method = Object.keys(endpoint[path])[0];
        const operation = endpoint[path][method];
        const { description, parameters: params, requestBody } = operation;
        let parameters = {
          type: "object",
          properties: {},
          required: [],
        };
        if (params) {
          for (const param of params) {
            const { name, description, required, schema } = param as any;
            parameters.properties[name] = {
              type: schema.type,
              description,
            };
            if (required) parameters.required.push(name);
          }
        }

        if (requestBody) {
          const schema = (requestBody as any).content["application/json"]
            .schema;

          const properties = schema.properties;
          const required = schema.required || [];
          parameters.required.push(...required);
          //   console.log(JSON.stringify(properties, null, 2));
          for (const propertyName in properties) {
            let property = properties[propertyName];
            if (property.allOf) {
              property = property.allOf[0];
            }
            parameters.properties[propertyName] = property;
          }
        }

        return {
          name: this.formatName(operation.summary),
          description,
          parameters,
        };
      });
    this.functionCalls = functionCalls;
    return functionCalls;
  }

  private formatName(name: string) {
    name = name.replace(/\s/g, "_");
    // Truncate if less than 64 characters
    if (name.length > 64) return name.slice(0, 64);
    return name;
  }

  // Public getter for the Swagger document
  get swagger() {
    return this.swaggerDoc;
  }

  // Public getter for endpoints
  get endpoints() {
    return this.taggedEndpoints;
  }

  /**
   * Parse the response message from OpenAI and return the API Operation
   */
  parseMessage(message: ChatCompletionMessage) {
    // If its not a function call, return false
    if (!message.function_call) return undefined;

    const payload = JSON.parse(message.function_call.arguments);
    const functionName = message.function_call.name;
    const endpoint = this.taggedEndpoints[functionName];
    const path = Object.keys(endpoint)[0];
    const method = Object.keys(endpoint[path])[0];
    return {
      payload,
      path,
      method,
      endpoint,
    } as Contract;
  }

  /**
   * Converts a Swagger path object to an Axios-compatible object.
   */
  parseResponseToApiCall(message: ChatCompletionMessage) {
    if (!this.baseUrl) {
      throw new Error("No base URL found. Set with chatterbox.baseUrl = url");
    }
    const url = this.baseUrl;
    const { path, method, payload } = this.parseMessage(message);

    let axiosConfig: AxiosRequestObject = {
      url: url + path,
      method,
    };
    const deepCopyOfPayload = JSON.parse(JSON.stringify(payload));

    for (let paramName in deepCopyOfPayload) {
      const param = deepCopyOfPayload[paramName];
      // Interpolate path parameters
      if (path.includes(`{${paramName}}`) || path.includes(`:${paramName}`)) {
        axiosConfig.url = axiosConfig.url.replace(`{${paramName}}`, param);
        axiosConfig.url = axiosConfig.url.replace(`:${paramName}`, param);
        delete deepCopyOfPayload[paramName];
      }
    }

    // If the method is get, we can assume that the parameters are query parameters
    if (method == "get") axiosConfig.params = deepCopyOfPayload;
    // Otherwise, we can assume that the parameters are body parameters
    else axiosConfig.data = deepCopyOfPayload;

    return axiosConfig;
  }
}

// Example usage

// async function main() {
//   const chatterService = await new Chatterbox(["Chat"]).fetchDoc(
//     "http://localhost:3000/api-docs-json"
//   );

//   console.log("Calling ChatGPT");
//   const result = await openai.chat.completions.create({
//     model: "gpt-4",
//     max_tokens: 500,
//     messages: [
//       {
//         role: "system",
//         content: chatterService.defaultSystemPrompt,
//       },
//       {
//         role: "user",
//         content:
//           "Lets append my last chat. the chat id was 55. Lets say its my birthday.",
//       },
//     ],
//     functions: chatterService.functionCalls,
//   });
//   const { message } = result.choices[0];
//   if (!message.function_call) return console.log(message);
//   console.log({ message });
//   const contract = chatterService.parseMessage(message);
//   console.log(contract);
//   const axiosRequest = chatterService.parseResponseToApiCall(message);
//   console.log(axiosRequest);
// }

// main();
