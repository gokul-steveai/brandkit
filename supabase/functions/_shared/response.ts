export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type": "application/json" },
  });
}

export function errorResponse(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
  return jsonResponse({ error: { code, message, details } }, status);
}