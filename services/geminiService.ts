
import { GoogleGenAI, GenerateContentResponse, Chat, Part } from "@google/genai";
import { ToolCall } from "../types";

const MODEL_NAME_IMAGE = 'gemini-2.5-flash-image'; // Changed to gemini-2.5-flash-image for general image tasks without explicit API key selection requirement
export const MODEL_NAME_TEXT = 'gemini-2.5-flash'; // Model for text-based chat

/**
 * Encodes a File object into a Base64 string.
 * @param file The File object to encode.
 * @returns A promise that resolves with the Base64 string of the file.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file as string."));
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Analyzes a plant image using the Gemini API to detect diseases.
 * @param file The image file to analyze.
 * @returns A promise that resolves with the detected disease information as a string.
 */
export async function analyzePlantImage(file: File): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const base64Image = await fileToBase64(file);

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME_IMAGE,
      contents: {
        parts: [
          {
            text: `Analyze this image of a plant and identify any diseases present. Provide a brief description of the disease and potential remedies.`,
          },
          {
            inlineData: {
              mimeType: file.type,
              data: base64Image,
            },
          },
        ],
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No text content found in the Gemini response.");
    }
    return textResult;

  } catch (error: any) {
    console.error("Error analyzing plant image with Gemini API:", error);
    // Generalize the error message, as API key management is external
    throw new Error(`Failed to analyze image: ${error.message || 'An unexpected API error occurred.'}`);
  }
}

/**
 * Sends a message to an existing chat session and streams the response.
 * @param chat The Chat object.
 * @param message The user's message.
 * @returns An async generator yielding chunks of the model's response.
 */
export async function* sendMessageToChat(chat: Chat, message: string): AsyncGenerator<string, void, unknown> {
  const streamResponse = await chat.sendMessageStream({ message: message });
  for await (const chunk of streamResponse) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      yield c.text;
    }
  }
}

/**
 * Placeholder for tool calling logic, if the model decides to use a tool.
 * @param toolCall The tool call object from the model.
 * @returns A promise that resolves with the tool's response.
 */
export async function executeTool(toolCall: ToolCall): Promise<any> {
  console.log("Model requested to call a tool:", toolCall.name, toolCall.args);
  // This is where you would implement logic to call your actual external tools
  // based on the toolCall.name and toolCall.args.
  // For this application, we don't anticipate function calls from the plant disease detection prompt.
  // This is just a placeholder to demonstrate the pattern.
  return Promise.resolve({
    result: `Tool ${toolCall.name} executed with args ${JSON.stringify(toolCall.args)}. No specific action implemented.`
  });
}

/**
 * Sends a tool response back to the Gemini model.
 * This is used after executing a function call requested by the model.
 * @param toolResponse The response from the executed tool.
 * @param functionCallId The ID of the function call this response relates to.
 * @param functionCallName The name of the function called.
 */
export async function sendToolResponse(
  toolResponse: any,
  functionCallId: string,
  functionCallName: string,
): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // In a chat session, you would send this response back to the chat history.
  // For a single generateContent call, this pattern is less common but useful for more complex interactions.
  console.log(`Sending tool response for ${functionCallName} (ID: ${functionCallId}):`, toolResponse);
  // Example for chat, assuming 'chat' object is available:
  // await chat.sendMessage({
  //   role: 'tool',
  //   content: {
  //     functionResponses: {
  //       id: functionCallId,
  //       name: functionCallName,
  //       response: { result: toolResponse },
  //     },
  //   },
  // });
}