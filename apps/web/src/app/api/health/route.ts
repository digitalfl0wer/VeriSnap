export function GET() {
  return Response.json({
    ok: true,
    service: "verisnap-web",
    time: new Date().toISOString()
  });
}

