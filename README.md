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
const baseUrl = "http://localhost:3000";
const swaggerUrl = `${baseUrl}/api-docs-json`;

const chatterbox = new Chatterbox(tagNames);
```

### Import Swagger Documentation

You can either fetch a Swagger document from a URL or load it from a local JSON object.

**Fetch Swagger Doc**

```typescript
await chatterbox.fetchDoc(swaggerUrl);
```

**Load Swagger Doc Locally**

```typescript
const swaggerDoc =
  /* your swagger doc as JSON object */
  await chatterbox.loadDoc(swaggerDoc);
```

## Methods

### `parseMessage(message: Message): ParsedMessage`

Parses an incoming message object and converts it into a mapped API call.

#### Example

```typescript
const mockFunctionCallMessage = {
  role: "assistant",
  content: null,
  function_call: {
    name: "Follow_up_on_a_chat",
    arguments: `{"message": "it's my birthday","chatId": "55"}`,
  },
} as any;

const parsedMessage = chatterbox.parseMessage(mockFunctionCallMessage);
```

### `parseResponseToApiCall(message: Message): ApiResponse`

Populates the required parameters to make an API call based on the parsed message.

#### Example

```typescript
const apiResponse = chatterbox.parseResponseToApiCall(mockFunctionCallMessage);
```

## Testing

Chatterbox-AI comes with an extensive testing suite to validate your Swagger document and make sure that your chat assistant is functioning correctly. You can find the test script in the `./test` directory.

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT

---

For more details, see the API documentation and examples on how to use specific features.

## Changelog

For recent changes, please see the CHANGELOG.md file.
