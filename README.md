# FleetPro deployment

FleetPro is a static web app. Supabase provides email/password authentication, a private PostgreSQL record for each fleet, and private storage for customer Aadhaar uploads. Admins manage the fleet; drivers are restricted to their assigned car, trips, and expenses. GitHub Pages hosts the frontend; the included GitHub Actions workflow deploys updates pushed to `main`. The browser uses only the Supabase publishable (formerly anon) key; row-level security and scoped database functions protect the stored data.

## 1. Create the Supabase project

1. Create a Supabase project on the free plan and keep its database password private.
2. In **SQL Editor**, run [`database/setup.sql`](./database/setup.sql), then [`database/role-based-access.sql`](./database/role-based-access.sql). The role migration is required for both new and existing installations; it replaces the initial owner-only policies with role-aware policies and creates the scoped Driver functions.
3. If an existing installation has not configured customer Aadhaar uploads, run [`database/trip-customer-aadhaar.sql`](./database/trip-customer-aadhaar.sql) **after** the role migration. This script preserves the Admin-only storage policies.
4. In **Authentication** settings, disable public sign-ups. Do not add a public registration flow.
5. From the project's API settings, copy the **Project URL** and **publishable/anon key** into `url` and `anonKey` in [`js/backend-config.js`](./js/backend-config.js). These two browser values are public; never use the `service_role` secret in frontend code.
6. In **Authentication → Users**, invite the owner/Admin account and any Driver accounts. After the invitee is listed in `auth.users`, use the Supabase **SQL Editor** to provision access. FleetPro does not expose a client-side role-management screen.

   Find an invited user's UUID with:

   ```sql
   select id, email from auth.users where email = 'admin@example.com';
   ```

   Map the Admin account to its own fleet row (replace the UUID):

   ```sql
   insert into public.fleet_access (user_id, owner_id, role, driver_id)
   values ('<ADMIN_AUTH_USER_UUID>', '<ADMIN_AUTH_USER_UUID>', 'admin', null)
   on conflict (user_id) do update
   set owner_id = excluded.owner_id, role = excluded.role, driver_id = null;
   ```

   Map a Driver account to the Admin's UUID and an existing driver record's `id` from that fleet's `drivers` data:

   ```sql
   insert into public.fleet_access (user_id, owner_id, role, driver_id)
   values ('<DRIVER_AUTH_USER_UUID>', '<ADMIN_AUTH_USER_UUID>', 'driver', '<EXISTING_DRIVER_ID>')
   on conflict (user_id) do update
   set owner_id = excluded.owner_id, role = excluded.role, driver_id = excluded.driver_id;
   ```

   Use the same `owner_id` for that fleet's Drivers. The linked driver record must be active and have a car assigned to it; the car's `driverId` must point back to that driver. A Driver without an active assigned car cannot create trips or expenses. Role assignments are database-managed and must not be set through user-editable auth metadata.

7. Load the app over HTTP/HTTPS and sign in. The first Admin sign-in initializes an empty fleet row if needed; invite and map the Admin before signing in.

The first successful Admin sign-in initializes an empty fleet for that account, with six zeroed months for the charts. Subsequent Admin changes save automatically to that owner's row. Drivers never receive the complete fleet payload: a database function returns only their assigned car, their own trip history (excluding customer Aadhaar data), and their own expenses. Driver trip and expense submissions use separate database functions that verify the linked active driver and assigned car server-side. Drivers cannot select or update the Admin's fleet row directly.

Driver-created trips are recorded as current trips for their assigned car and driver. Driver-created expenses are saved as pending and appear in the Admin's expense review and notifications. Admins retain access to all existing fleet features, including expense approvals and customer Aadhaar records. Customer Aadhaar number and document are optional Admin trip fields. Uploaded documents are stored in a private Supabase Storage bucket, limited to 5 MB, and accessible only to the authenticated Admin. Aadhaar details are not included in WhatsApp drafts.

## 2. Deploy to GitHub Pages

1. Push this repository, including the configured `js/backend-config.js`, to GitHub. The Supabase publishable key is intended for browser use; do not commit a service-role key or database password.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build and deployment source if it is not already selected.
3. Push to `main` or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
4. Open `https://<owner>.github.io/<repository>/`. For this repository, the URL is `https://proloydas09.github.io/fleetpro/`.
5. In Supabase **Authentication → URL Configuration**, set the deployed URL as the Site URL and add it to the Redirect URLs list.
6. In Supabase **Authentication → Users**, invite the Admin and Driver accounts, then configure the corresponding `fleet_access` rows as described above. Invite links open the password setup form; the sign-in screen also offers password recovery.

The included `_headers` file can be used by compatible static hosts such as Cloudflare Pages; GitHub Pages does not apply it.

## Local/demo mode

If the Supabase configuration is blank or the Supabase client CDN is unavailable, the app explicitly runs in demo mode with sample data. Demo mode is an Admin-only preview; changes are not saved. Role-based sign-in requires Supabase and the `fleet_access` migration. Serve the repository over HTTP rather than opening `index.html` directly.
