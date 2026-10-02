import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "Gestor Zap V2",
    timestamp: new Date().toISOString(),
  });
}
