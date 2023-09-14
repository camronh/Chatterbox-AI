# Chatterbox-AI: Your Swaggable Assistant

## Introduction

Chatterbox-AI is a robust TypeScript library designed to work hand-in-hand with Swagger/OpenAPI documentation. It offers a seamless interface for your chat assistant to perform function calls directly mapped from a Swagger document. With Chatterbox-AI, you get to convert your Swagger-aided API into a potent chat capable of handling complex queries and interactions.

## Installation

```bash
npm install chatterbox-ai

# Or

bun add chatterbox-ai
```

## Features

- 📃 Automatically maps Swagger documentation to function calls.
- 💼 Supports both online fetching and local loading of Swagger documents.
- 🤖 Handles chat messages and converts them into back API calls.

## Quick Start

To use Chatterbox-AI, you'll need to import the package and instantiate it with specific tagNames.

Here's a simple example:

```typescript
import Chatterbox from "chatterbox-ai";

const tagNames = ["Chat"];

const chatterbox = new Chatterbox(tagNames);
```

### Import Swagger Documentation

You can either fetch a Swagger document from a URL or load it from a local JSON object.

**Fetch Swagger Doc**

```typescript
const swaggerUrl = `http://localhost:3000/api-docs-json`;

await chatterbox.fetchDoc(swaggerUrl);
```

**Load Swagger Doc Locally**

```typescript
const swaggerDoc = document; /* your swagger doc as JSON object */
await chatterbox.loadDoc(swaggerDoc);
```

## Usage

### Function Calling

We can use the `functionCalls` in our OpenAI chat creation endpoint. We also have a `defaultSystemPrompt` that is a complementary
prompt that fits well with API calls.

```typescript
const result = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: chatterbox.defaultSystemPrompt,
    },
    {
      role: "user",
      content: "Can you create a new document for me please?",
    },
  ],
  functions: chatterbox.functionCalls,
});
```

### Parse the Generation

When parsing the generated response from OpenAI, we have 2 options. We can parse the arguments and just get the payload, or we can parse it directly
to an API call, which will populate all of the fields and parameters for us.

**Parse to Payload**

```typescript
const { message } = result.choices[0];
if (!message.function_call) continue;

// Payload is the arguments for the function call
// Endpoint is the OpenAPI path object
// Method and Path are the endpoint's method and path as strings
const { endpoint, method, path, payload } = chatterbox.parseMessage(message);

// Pass the arguments to your functions
await createDocument(payload);
```

**Parse to API Call**

When we use `parseMessageToRequest`:

- Path params are automatically populated
- The other parameters are populated as query params or body params depending on the method

```typescript
const req = chatterbox.parseMessageToRequest(message);
const { data } = await axios(req);
```
