export function createResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function createErrorResponse(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}
