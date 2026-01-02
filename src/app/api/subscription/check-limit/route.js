import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resource_type } = await request.json();

    const validTypes = ['properties', 'units', 'tenants', 'workers', 'sms'];
    if (!validTypes.includes(resource_type)) {
      return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.rpc("check_subscription_limit", {
      org_id: profile.organization_id,
      limit_type: resource_type,
    });

    if (error) {
      console.error("Limit check error:", error);
      return NextResponse.json({ allowed: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allowed: data === true, resource_type });
  } catch (error) {
    console.error("Check limit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}