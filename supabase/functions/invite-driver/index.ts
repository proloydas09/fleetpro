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

async function findUserByPhone(adminClient: ReturnType<typeof createClient>, phone: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find(user => user.phone === phone);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Too many accounts to safely locate this phone number.");
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
  if (!token) return respond(401, { error: "Sign in as an Admin to invite a Driver." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Driver invitations are not configured on the server." });
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
    if (!access) return respond(403, { error: "Only a FleetPro Admin can invite Drivers." });

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

    const { data: fleet, error: fleetError } = await adminClient
      .from("fleet_data")
      .select("payload")
      .eq("owner_id", userData.user.id)
      .maybeSingle();
    if (fleetError) throw fleetError;
    if (!fleet?.payload) return respond(404, { error: "Fleet data is not initialized." });

    const payload = fleet.payload as {
      drivers?: Array<{ id?: string; name?: string; phone?: string; status?: string; carId?: string | null }>;
      cars?: Array<{ id?: string; driverId?: string | null; status?: string }>;
    };
    if (!Array.isArray(payload.drivers) || !Array.isArray(payload.cars)) {
      return respond(500, { error: "Fleet Driver and car data is invalid. Reload the Admin app and try again." });
    }
    const driver = payload.drivers.find(item => item.id === driverId);
    if (!driver || driver.status !== "active" || !driver.carId) {
      return respond(400, { error: "The Driver must be active and assigned to a car before inviting." });
    }
    const car = payload.cars.find(item =>
      item.id === driver.carId && item.driverId === driverId && item.status === "active"
    );
    if (!car) return respond(400, { error: "Assign this Driver to an active car before inviting." });

    const phone = normalizePhone(driver.phone);
    if (!phone) {
      return respond(400, { error: "Enter a valid phone number. Indian numbers can use 10 digits or the +91 country code." });
    }

    const { data: existingLink, error: linkError } = await adminClient
      .from("fleet_access")
      .select("user_id")
      .eq("owner_id", userData.user.id)
      .eq("driver_id", driverId)
      .maybeSingle();
    if (linkError) throw linkError;

    let authUser: Awaited<ReturnType<typeof findUserByPhone>>;
    if (existingLink) {
      const { data: linkedUser, error: linkedUserError } = await adminClient.auth.admin.getUserById(existingLink.user_id);
      if (linkedUserError) throw linkedUserError;
      authUser = linkedUser.user;
    } else {
      authUser = await findUserByPhone(adminClient, phone);
    }
    let createdUserId = "";

    if (existingLink && !authUser) {
      return respond(409, { error: "The linked Driver account no longer exists. Contact support to repair this role mapping." });
    }
    if (authUser) {
      const { data: currentAccess, error: currentAccessError } = await adminClient
        .from("fleet_access")
        .select("owner_id, role, driver_id")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (currentAccessError) throw currentAccessError;
      if (currentAccess && (
        currentAccess.owner_id !== userData.user.id ||
        currentAccess.role !== "driver" ||
        currentAccess.driver_id !== driverId
      )) {
        return respond(409, { error: "This phone number is already linked to another FleetPro account." });
      }

      if (authUser.phone !== phone) {
        const duplicateUser = await findUserByPhone(adminClient, phone);
        if (duplicateUser && duplicateUser.id !== authUser.id) {
          return respond(409, { error: "This phone number is already used by another account." });
        }
        const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(
          authUser.id,
          { phone, phone_confirm: false },
        );
        if (updateError) throw updateError;
        authUser = updated.user;
      }
    } else {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        phone,
        phone_confirm: false,
      });
      if (createError) throw createError;
      authUser = created.user;
      createdUserId = authUser.id;
    }

    const { error: upsertError } = await adminClient
      .from("fleet_access")
      .upsert({
        user_id: authUser.id,
        owner_id: userData.user.id,
        role: "driver",
        driver_id: driverId,
      });
    if (upsertError) {
      if (createdUserId) await adminClient.auth.admin.deleteUser(createdUserId);
      throw upsertError;
    }

    const { error: otpError } = await userClient.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });
    if (otpError) {
      console.error("Driver account is provisioned, but the login SMS could not be sent.", otpError);
      return respond(200, {
        ok: true,
        otpSent: false,
        message: "Driver account is linked, but the SMS could not be sent. Check the project's SMS provider and rate limits, then invite again.",
      });
    }

    return respond(200, {
      ok: true,
      otpSent: true,
      message: `Driver account linked. A login code was sent to ${phone}.`,
    });
  } catch (error) {
    console.error("Driver invitation failed.", error);
    return respond(500, {
      error: error instanceof Error ? error.message : "Driver invitation failed unexpectedly.",
    });
  }
});
