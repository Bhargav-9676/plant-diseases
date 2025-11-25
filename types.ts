// Fix: Explicitly define the ToolCall interface with 'name' and 'args'
// properties as shown in the Gemini API Function Calling examples.
// This resolves the TypeScript error indicating that these properties do not exist on the ToolCall type.
// The FunctionCall type in @google/genai is expected to contain these properties based on documentation.
// The direct import of FunctionCall is no longer needed as ToolCall is now explicitly defined.

/**
 * Represents a tool call that the model wants the client to execute.
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string; // 'id' is also present in the example FunctionCall object
}