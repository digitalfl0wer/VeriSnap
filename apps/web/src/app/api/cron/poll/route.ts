export function GET(request: Request) {
  const url = new URL(request.url);
  const provided = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json(
    {
      ok: false,
      status: "not_implemented",
      message: "Cron polling is scaffolded but not implemented yet."
    },
    { status: 501 }
  );
}

