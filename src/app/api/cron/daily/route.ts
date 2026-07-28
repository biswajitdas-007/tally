import { runDaily } from "@/lib/cron-daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = runDaily;
