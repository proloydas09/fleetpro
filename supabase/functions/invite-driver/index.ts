import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(`+${digits}`) ? `+${digits}` : "";
  }
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return "";
}

function driverLoginEmail(phone: string): string {
  return `driver-${phone.replace(/\D/g, "")}@login.fleetpro.invalid`;
}

async function findUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find(user => user.email === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Too many accounts to safely locate this Driver login.");
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond(401, { error: "Sign in as an Admin to manage Driver passwords." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Driver account management is not configured on the server." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return respond(401, { error: "Your session is invalid. Sign in again." });
    }

    const { data: access, error: accessError } = await adminClient
      .from("fleet_access")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .eq("owner_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (accessError) throw accessError;
    if (!access) return respond(403, { error: "Only a FleetPro Admin can manage Driver passwords." });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respond(400, { error: "Request body must be valid JSON." });
    }
    if (!body || typeof body !== "object" || !("driverId" in body) ||
      typeof body.driverId !== "string" || !body.driverId.trim()) {
      return respond(400, { error: "A Driver record is required." });
    }
    const driverId = body.driverId.trim();
    const action = "action" in body && typeof body.action === "string" ? body.action : "";
    if (!["set_password", "update_phone"].includes(action)) {
      return respond(400, { error: "A supported Driver account action is required." });
    }
    let password = "";
    if (action === "set_password") {
      if (!("password" in body) || typeof body.password !== "string" ||
        body.password.length < 8 || body.password.length > 128) {
        return respond(400, { error: "Driver passwords must be between 8 and 128 characters." });
      }
      password = body.password;
    }

    const { data: fleet, error: fleetError } = await adminClient
      .from("fleet_data")
      .select("payload")
      .eq("owner_id", userData.user.id)
      .maybeSingle();
    if (fleetError) throw fleetError;
    if (!fleet?.payload) return respond(404, { error: "Fleet data is not initialized." });

    const payload = fleet.payload as {
      drivers?: Array<{ id?: string; phone?: string }>;
    };
    if (!Array.isArray(payload.drivers)) {
      return respond(500, { error: "Fleet Driver data is invalid. Reload the Admin app and try again." });
    }
    const driver = payload.drivers.find(item => item.id === driverId);
    if (!driver) return respond(404, { error: "This Driver record does not belong to your fleet." });

    const phone = normalizePhone(driver.phone);
    if (!phone) {
      return respond(400, { error: "Enter a valid phone number. Indian numbers can use 10 digits or the +91 country code." });
    }
    const loginEmail = driverLoginEmail(phone);

    const { data: existingLink, error: linkError } = await adminClient
      .from("fleet_access")
      .select("user_id")
      .eq("owner_id", userData.user.id)
      .eq("driver_id", driverId)
      .eq("role", "driver")
      .maybeSingle();
    if (linkError) throw linkError;

    if (action === "update_phone") {
      if (!existingLink) return respond(200, { ok: true, accountUpdated: false });
      const { data: linkedUser, error: linkedUserError } = await adminClient.auth.admin.getUserById(existingLink.user_id);
      if (linkedUserError) throw linkedUserError;
      const currentEmail = linkedUser.user.email || "";
      if (currentEmail && !/^driver-\d+@login\.fleetpro\.invalid$/.test(currentEmail)) {
        return respond(409, { error: "This Driver account uses a different login email and cannot be changed automatically." });
      }

      const duplicateUser = await findUserByEmail(adminClient, loginEmail);
      if (duplicateUser && duplicateUser.id !== linkedUser.user.id) {
        return respond(409, { error: "This phone number is already linked to another FleetPro account." });
      }
      if (currentEmail !== loginEmail) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          linkedUser.user.id,
          { email: loginEmail, email_confirm: true },
        );
        if (updateError) throw updateError;
      }
      return respond(200, { ok: true, accountUpdated: true });
    }

    let authUserId = existingLink?.user_id || "";
    if (existingLink) {
      const { data: linkedUser, error: linkedUserError } = await adminClient.auth.admin.getUserById(existingLink.user_id);
      if (linkedUserError) throw linkedUserError;
      const currentEmail = linkedUser.user.email || "";
      if (currentEmail && !/^driver-\d+@login\.fleetpro\.invalid$/.test(currentEmail)) {
        return respond(409, { error: "This Driver account uses a different login email and cannot be managed automatically." });
      }
      const duplicateUser = await findUserByEmail(adminClient, loginEmail);
      if (duplicateUser && duplicateUser.id !== linkedUser.user.id) {
        return respond(409, { error: "This phone number is already linked to another FleetPro account." });
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        linkedUser.user.id,
        { email: loginEmail, email_confirm: true, password },
      );
      if (updateError) throw updateError;
    } else {
      const duplicateUser = await findUserByEmail(adminClient, loginEmail);
      if (duplicateUser) {
        return respond(409, { error: "This phone number is already linked to another FleetPro account." });
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: loginEmail,
        email_confirm: true,
        password,
      });
      if (createError) throw createError;
      authUserId = created.user.id;

      const { error: upsertError } = await adminClient
        .from("fleet_access")
        .upsert({
          user_id: authUserId,
          owner_id: userData.user.id,
          role: "driver",
          driver_id: driverId,
        });
      if (upsertError) {
        await adminClient.auth.admin.deleteUser(authUserId);
        throw upsertError;
      }
    }

    return respond(200, { ok: true, message: "Driver password saved. Share it with the Driver securely." });
  } catch (error) {
    console.error("Driver account management failed.", error);
    return respond(500, {
      error: error instanceof Error ? error.message : "Driver account management failed unexpectedly.",
    });
  }
});
