# FleetPro deployment

FleetPro is a static web app. Supabase provides Admin email/password authentication, Driver phone/SMS OTP authentication, private fleet data, and private storage for customer Aadhaar uploads. Admins manage the fleet; Drivers are restricted to their assigned car, trips, and expenses. GitHub Pages hosts the frontend. The browser uses only the Supabase publishable key; the service-role key is used only by the `invite-driver` Edge Function.

## 1. Configure Supabase

1. Create a Supabase project and keep its database password private.
2. In **SQL Editor**, run [`database/setup.sql`](./database/setup.sql), then [`database/role-based-access.sql`](./database/role-based-access.sql). The role migration is required for new and existing installations.
3. If an existing installation has not configured customer Aadhaar uploads, run [`database/trip-customer-aadhaar.sql`](./database/trip-customer-aadhaar.sql) after the role migration.
4. In **Authentication → Sign-in providers**, enable **Phone** authentication. Configure an SMS provider and an SMS OTP template. SMS delivery may require a paid provider and, in India, applicable DLT registration and template approval. Configure appropriate OTP rate limits and CAPTCHA for production.
5. In **Authentication** settings, disable public sign-ups. Driver OTP login is for accounts first provisioned by an Admin; the sign-in flow does not create uninvited accounts.
6. Copy the Supabase **Project URL** and **publishable key** into `url` and `anonKey` in [`js/backend-config.js`](./js/backend-config.js). These browser values are public. Never put a `service_role` secret in frontend code or commit it to the repository.

## 2. Provision the initial Admin

1. In Supabase **Authentication → Users**, invite or create the initial Admin account using their email.
2. Find the Admin's auth UUID:

   ```sql
   select id, email from auth.users where email = 'admin@example.com';
   ```

3. Map that account as Admin, replacing the UUID:

   ```sql
   insert into public.fleet_access (user_id, owner_id, role, driver_id)
   values ('<ADMIN_AUTH_USER_UUID>', '<ADMIN_AUTH_USER_UUID>', 'admin', null)
   on conflict (user_id) do update
   set owner_id = excluded.owner_id, role = 'admin', driver_id = null;
   ```

The initial Admin signs in through the Admin tab using email/password. A first sign-in initializes an empty fleet row with six zeroed chart months.

## 3. Deploy the Driver invitation function

The Admin-only `invite-driver` Supabase Edge Function creates or links the phone-auth account, assigns its protected `fleet_access` Driver mapping, and sends the initial SMS login code. Its service-role credential stays on the server.

Install the Supabase CLI, then from the repository root run:

```sh
supabase login
supabase link --project-ref kvpiealmuopazmzvscsu
supabase functions deploy invite-driver
```

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the deployed function. Do not copy these server credentials into `js/backend-config.js`.

## 4. Invite a Driver from FleetPro

1. Sign in as Admin, open **Drivers**, and add the Driver using the phone number they will use to log in.
2. Assign the Driver to an active car and ensure the car is assigned back to that Driver.
3. Open the Driver's profile and choose **Invite / Send Login Code**. FleetPro creates/links their phone account and sends an SMS OTP. Use the same action to resend a code if needed, subject to Supabase/provider rate limits.
4. The Driver opens the same FleetPro URL, chooses the **Driver** tab, enters the registered phone number, requests a code, and verifies the SMS code. No email or password is required.

Ten-digit Indian mobile numbers are treated as `+91`; other numbers should be entered with their country code (E.164 format). Driver account and role provisioning is handled by the Edge Function, not by client-side SQL or user-editable metadata. Drivers without an active assigned car cannot be invited or submit trips/expenses.

Drivers receive only their assigned car, their own trips, and their own expenses. Driver trips update fleet earnings; Driver expenses are submitted as pending for Admin review. The Edge Function must be deployed and an SMS provider configured before in-app invitations and phone login will work.

## 5. Deploy to GitHub Pages

1. Push the repository, including `js/backend-config.js` with the public Supabase URL and publishable key, to GitHub. Never commit a service-role key or database password.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the deployment source.
3. Push to `main` or run **Deploy to GitHub Pages** from the **Actions** tab.
4. Open `https://<owner>.github.io/<repository>/`. This repository's URL is `https://proloydas09.github.io/fleetpro/`.
5. In Supabase **Authentication → URL Configuration**, set the deployed app URL as the Site URL and add it to Redirect URLs.

The included `_headers` file can be used by compatible static hosts such as Cloudflare Pages; GitHub Pages does not apply it.

## Local/demo mode

If Supabase configuration is blank or the Supabase client CDN is unavailable, the app explicitly runs in demo mode with sample data. Demo mode is an Admin-only preview; changes are not saved. Role-based sign-in requires Supabase, the `fleet_access` migration, a deployed invitation function, and an SMS provider for Driver phone authentication. Serve the repository over HTTP rather than opening `index.html` directly.
