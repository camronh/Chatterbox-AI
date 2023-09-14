// Import required packages and Chatterbox class
import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import Chatterbox from "../src"; // Replace with your actual import statement
import fs from "fs";

const swaggerDoc = JSON.parse(fs.readFileSync("./test/swagger.json", "utf8"));

const tagNames = ["Chat"];

const baseUrl = "http://localhost:3000";
const swaggerUrl = `${baseUrl}/api-docs-json`;

describe("Chatterbox Class Tests", () => {
  let chatterbox: Chatterbox = new Chatterbox(tagNames);

  beforeEach(() => {
    chatterbox = new Chatterbox(tagNames);
  });

  // Test instantiation
  describe("Instantiation", () => {
    it("should instantiate Chatterbox correctly", () => {
      expect(chatterbox).to.be.an.instanceOf(Chatterbox);
      expect(chatterbox).to.have.property("tagNames");
      expect(chatterbox.tagNames).to.be.an("array");
      expect(chatterbox.functionCalls).to.be.an("array");
    });
  });

  // Test fetch and validate Swagger doc
  describe("Import Swagger Document", () => {
    it("should fetch and validate a Swagger document", async () => {
      await chatterbox.fetchDoc(swaggerUrl);
      expect(chatterbox).to.have.property("swagger");
      expect(chatterbox.swagger).to.be.an("object");

      // Array with length greater than 1
      expect(chatterbox.functionCalls).to.be.an("array");
      expect(chatterbox.functionCalls.length).to.be.greaterThan(0);

      expect(chatterbox.baseUrl).to.equal(baseUrl);

      expect(chatterbox.endpoints).to.be.an("object");
    });

    it("should load in and validate a Swagger document", async () => {
      await chatterbox.loadDoc(swaggerDoc);
      expect(chatterbox).to.have.property("swagger");
      expect(chatterbox.swagger).to.be.an("object");

      // Array with length greater than 1
      expect(chatterbox.functionCalls).to.be.an("array");
      expect(chatterbox.functionCalls.length).to.be.greaterThan(0);

      expect(chatterbox.baseUrl).to.equal(baseUrl);

      expect(chatterbox.endpoints).to.be.an("object");
    });

    it("should handle errors when Swagger doc is invalid", async () => {
      const invalidSwaggerDoc = {
        info: {
          title: "Invalid Swagger Doc",
        },
      };

      try {
        await chatterbox.loadDoc(invalidSwaggerDoc as any);
        // if the above line does not throw, then fail the test
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).to.be.instanceOf(Error); // or whatever check you'd like to do
      }
    });
  });

  // Test message parsing
  describe("Parse Message", () => {
    let parser: Chatterbox = new Chatterbox(tagNames);
    const mockFunctionCallMessage = {
      role: "assistant",
      content: null,
      function_call: {
        name: "Follow_up_on_a_chat",
        arguments: `{\n  "message": "it's my birthday",\n  "chatId": "55"\n}`,
      },
    } as any;

    const mockChatMessage = {
      role: "assistant",
      content: "Hello",
    } as any;

    it("should parse the incoming message correctly", async () => {
      await parser.loadDoc(swaggerDoc);
      const parsedMessage = parser.parseMessage(mockFunctionCallMessage)!;
      expect(parsedMessage.path).to.equal("/chats/{chatId}");
      expect(parsedMessage.method).to.equal("post");
      expect(parsedMessage.payload).to.deep.equal({
        message: "it's my birthday",
        chatId: "55",
      });
      expect(parsedMessage.endpoint).to.be.an("object");
    });

    it("should should populate parameters", () => {
      const parsedMessage = parser.parseResponseToApiCall(
        mockFunctionCallMessage
      );

      expect(parsedMessage.url).to.equal("http://localhost:3000/chats/55");
      expect(parsedMessage.method).to.equal("post");
      expect(parsedMessage.data).to.deep.equal({
        message: "it's my birthday",
      });
    });
  });
});
