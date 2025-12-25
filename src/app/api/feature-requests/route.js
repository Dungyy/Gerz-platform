import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

function isEmail(v) {
  return !v || (typeof v === "string" && v.includes("@") && v.includes("."));
}

export async function POST(request) {
  try {
    const body = await request.json();

    const title = (body?.title || "").trim();
    const details = (body?.details || "").trim();
    const priority = (body?.priority || "medium").trim().toLowerCase();

    const name = (body?.name || "").trim() || null;
    const email = (body?.email || "").trim() || null;

    if (!title || title.length < 4) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!details || details.length < 10) {
      return NextResponse.json(
        { error: "Details must be at least 10 characters" },
        { status: 400 }
      );
    }
    if (!ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Email is invalid" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("feature_requests").insert({
      title,
      details,
      priority,
      name,
      email,
      status: "new",
    });

    if (error) {
      console.error("feature request insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit feature request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("feature request route error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
