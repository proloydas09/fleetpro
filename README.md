# FleetPro deployment

FleetPro is a static web app. Supabase provides email/password authentication and a private PostgreSQL row for each owner's fleet data. GitHub Pages hosts the frontend; the included GitHub Actions workflow deploys updates pushed to `main`. The browser uses only the Supabase publishable (formerly anon) key; row-level security protects the stored data.

## 1. Create the Supabase project

1. Create a Supabase project on the free plan and keep its database password private.
2. In **SQL Editor**, run [`database/setup.sql`](./database/setup.sql).
3. In **Authentication** settings, disable public sign-ups. Do not add a public registration flow.
4. From the project's API settings, copy the **Project URL** and **publishable/anon key** into `url` and `anonKey` in [`js/backend-config.js`](./js/backend-config.js). These two browser values are public; never use the `service_role` secret in frontend code.
5. Load the app over HTTP/HTTPS and sign in with the account you created.

The first successful sign-in initializes an empty fleet for that account, with six zeroed months for the charts. Subsequent changes save automatically to that owner's row. The database row is protected by row-level security and cannot be read or changed by anonymous users or another account.

## 2. Deploy to GitHub Pages

1. Push this repository, including the configured `js/backend-config.js`, to GitHub. The Supabase publishable key is intended for browser use; do not commit a service-role key or database password.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build and deployment source if it is not already selected.
3. Push to `main` or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
4. Open `https://<owner>.github.io/<repository>/`. For this repository, the URL is `https://proloydas09.github.io/fleetpro/`.
5. In Supabase **Authentication → URL Configuration**, set the deployed URL as the Site URL and add it to the Redirect URLs list.
6. In Supabase **Authentication → Users**, invite the owner. The invite link opens the password setup form; the sign-in screen also offers password recovery.

The included `_headers` file can be used by compatible static hosts such as Cloudflare Pages; GitHub Pages does not apply it.

## Local/demo mode

If the Supabase configuration is blank or the Supabase client CDN is unavailable, the app explicitly runs in demo mode with sample data. Changes in demo mode are not saved. Serve the repository over HTTP rather than opening `index.html` directly.
