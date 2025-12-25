import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isEmail(v) {
  return typeof v === "string" && v.includes("@") && v.includes(".");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim();
    const subject = (body?.subject || "").trim();
    const message = (body?.message || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }
    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name,
      email,
      subject: subject || null,
      message,
      source: "web",
      status: "new",
    });

    if (error) {
      console.error("contact insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("contact route error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
