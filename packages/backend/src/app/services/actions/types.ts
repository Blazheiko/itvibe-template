export interface ToolDefinition {
  description: string;
  parametersSchema: Record<string, unknown>;
}

export interface ToolCallHandler {
  tools: Record<string, ToolDefinition>;
  onCall(name: string, args: unknown): Promise<string>;
}
