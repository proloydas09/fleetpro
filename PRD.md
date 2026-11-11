# FleetPro Product Requirements Document

## 1. Product overview

**Product:** FleetPro — Car Business Manager
**Document status:** Current-state product specification
**Platform:** Responsive, browser-based web application
**Primary market:** Owners and operators of small car-rental and fleet businesses in India

FleetPro helps a fleet business keep vehicle, driver, trip, expense, document, and business-performance information in one place. Admins maintain fleet records and review operations; Drivers use a restricted workspace to log trips and submit expenses for review.

This document describes behavior present in the application today. Where the interface suggests a capability that is not yet fully implemented, the limitation is called out rather than treated as a supported requirement.

## 2. Users and goals

### Primary users

#### Admin (fleet owner/operator)

The owner or operator needs to:

- Maintain an inventory of vehicles and their operating status.
- Keep driver contact, identity, assignment, and compensation details together.
- Record trips and customer details, including optional customer identity information.
- Track expenses and review their approval status.
- Monitor vehicle and driver document expiry and service needs.
- Understand fleet earnings, expenses, and performance at a glance.
- Keep business data separate from other owners' accounts.

#### Driver

- Access their own assigned active car, own trip history, and own expense submissions.
- Log trips only against their assigned car and add expenses for Admin review.

### Current access model

- Fleet accounts are provisioned by an administrator; public registration is not offered.
- Role-based sign-in supports **Admin** and **Driver** accounts.
- An Admin has access to all fleet-management features and to the fleet's complete data.
- A Driver is linked to one existing driver record and can access only Trips and Expenses for their assigned car and own records.
- Admins and Drivers are invited and linked manually through Supabase account provisioning and the protected `fleet_access` table; the app has no user/role administration screen.

## 3. Product scope and navigation

The main navigation provides **Dashboard**, **Fleet**, **Drivers**, **Trips**, and **Reports**. The owner profile links to **Expenses & Approvals** and **Documents** as well as the main sections.

The shared application shell includes:

- A loading/splash screen and sign-in/password setup screens.
- A persistent dark/light theme toggle; the selected theme is saved in the browser.
- Notifications with an unread badge and a “mark all read” action.
- Mobile-oriented navigation, dialogs, confirmation prompts, and transient status messages.
- Role-specific navigation: Admins see the complete app, while Drivers see Trips, Expenses, theme controls, and sign-out.

## 4. Functional requirements

### 4.1 Authentication and account data

- An account holder can sign in with email and password.
- An invited account holder can set a password from an invitation or recovery link. Password setup requires matching entries and a minimum of eight characters.
- An account holder can request a password setup/recovery email and sign out.
- After successful Admin sign-in, FleetPro loads that Admin's fleet data. A first-time Admin receives an empty fleet and six zeroed monthly chart entries. Driver sign-in loads only the allowlisted Driver workspace projection.
- Changes to the fleet data are saved automatically to the authenticated owner's Supabase record. The interface displays saving, saved, connection, and save-error states; a failed save can be retried.
- The database applies row-level security so an authenticated owner can access only their own fleet record. Public/anonymous access is revoked.
- The protected `fleet_access` record assigns a user's role, fleet owner, and (for Drivers) linked driver record. Users cannot assign themselves roles.
- Missing, invalid, or inactive role mappings fail closed; an account without a valid role cannot enter the app.
- Drivers never read the complete fleet JSON payload. A database function returns an allowlisted projection of their assigned car, own driver profile, own trips, and own expenses.
- Direct Driver access to fleet records and customer Aadhaar storage is denied by row-level and storage policies.

### 4.2 Dashboard

The dashboard gives the owner a summary of:

- Total fleet earnings, expenses, and derived net profit.
- Registered cars, active drivers, and total trips.
- Current/in-progress trips, recent trips, and per-car profit summaries.
- Overdue maintenance items.
- A six-month, all-cars earnings-versus-expenses chart.

The dashboard provides shortcuts into fleet, driver, and trip management. Current-trip entries can link to trip details and offer a phone-call link when a driver's phone number is available.

### 4.3 Fleet and vehicle records

The owner can:

- View the vehicle list, filter vehicles by status, open vehicle details, and add, edit, or delete a vehicle.
- Store vehicle identity and operating details such as registration/plate, make, model, year, color, vehicle type, fuel type, odometer reading, and active/maintenance status.
- Store vehicle earnings/expense totals, service information, and relevant document details.
- Assign or change a driver for a vehicle.
- Review vehicle trip, expense, and maintenance information from vehicle details.
- View vehicle document photos where provided.

Vehicle document expiry tracking covers available records for insurance, registration certificate (RC), permit, pollution certificate (PUC), fitness certificate (CF), and tax. Optional document types are shown only when an expiry date exists.

### 4.4 Driver records

The owner can:

- Search drivers by name or phone, view driver details, add and edit a driver, and switch driver active/inactive status.
- Store contact and identity information, including phone, driving-license number and expiry, address, joining date, and optional identity/document details.
- Store driver-to-car assignment and compensation/performance information such as salary, commission percentage, advance, rating, trip count, and earnings.
- View a driver's license photo and Aadhaar card where those records are present.
- See duplicate-identity warnings when adding or editing a driver whose phone number, Aadhaar number, or license is already recorded for another driver.

Only active drivers are offered in the new-trip driver selector.

### Driver workspace and access

- A Driver signs in with an invited email/password account and is associated with an existing driver record by an Admin using `fleet_access`.
- The Driver workspace exposes only Trips and Expenses plus theme selection and sign-out. Dashboard, fleet, reports, documents, profile, notifications, and Admin expense approvals are not available.
- A Driver can see only their assigned car, their own profile's non-sensitive operational fields, their own trips, and their own expenses.
- Driver access to the fleet payload is provided by a narrowly scoped database function; the Driver cannot query or update `fleet_data` directly.
- Customer Aadhaar numbers, Aadhaar files, other drivers' records, other cars, and other drivers' trips/expenses are not returned to a Driver.
- If the linked driver is inactive, or has no active assigned car, new trip and expense submissions are blocked. Role provisioning and driver-to-car assignment remain Admin-managed.

### 4.5 Trips and customer details

The owner can:

- Log, search, filter, inspect, complete, and delete trips.
- Record origin, destination, distance, fare, date, time, assigned car, assigned active driver, and optional notes.
- Record a required starting odometer reading and an optional ending odometer reading. An ending reading cannot be less than the starting reading.
- Attach optional start/end odometer photos. Image uploads are limited to 5 MB.
- Store optional customer name and phone number.
- Store an optional 12-digit customer Aadhaar number and an optional Aadhaar image or PDF. Spaces and hyphens are ignored when validating the number.
- View trip fare, distance, driver commission, net earning, status, odometer readings, and available customer details in the trip detail view.
- Prepare WhatsApp message drafts for the assigned driver and, when a customer phone number is supplied, for the customer. Aadhaar number and document information must never be included in those drafts.

Trip form assignment behavior:

- Selecting a car selects its currently assigned driver if that driver is available.
- Selecting a driver selects that driver's assigned car if available.
- The owner can change either selection after the automatic synchronization.
- Driver trip forms are restricted to the Driver's own assigned active car; the server assigns the associated driver and car rather than trusting submitted identity/assignment values.
- Drivers may view their own trip details and log trips, but cannot delete trips or change trip status. Admins retain the existing trip controls.
- Driver-created trips may include optional customer name and phone but cannot include or access customer Aadhaar fields or files.
- The fleet's car earnings are incremented atomically with a Driver-created trip.

Customer Aadhaar uploads use the private `trip-customer-aadhaar` Supabase Storage bucket. The bucket accepts JPEG, PNG, WebP, or PDF files up to 5 MB. Storage policies restrict read, upload, and delete operations to the authenticated Admin’s folder. Drivers cannot upload or view customer Aadhaar documents. The Aadhaar number and file are optional Admin trip fields.

**Location limitation:** A trip may be marked current/in progress, but the application does not provide live GPS tracking or live driver location.

### 4.6 Expenses and approvals

The owner can:

- Record an expense with category, amount, date, description, associated vehicle and/or driver, and an optional receipt/photo.
- Use the categories Fuel, Maintenance, Insurance, Permit, Toll, Washing, and Other.
- View expenses by pending, approved, rejected, or all status and inspect expense details.
- Approve or reject a pending expense. An approved expense can be revoked; a rejected expense can be approved again.
- Review expense counts and approved totals by category.

Expenses entered directly by the owner are automatically approved. Pending expense records can be reviewed in the approval workflow.

- Driver-created expenses are linked by the database to the submitting Driver and their assigned car, saved as **pending**, and excluded from approved car expense totals until approved.
- Drivers can view only their own expense records and receipt images; they cannot approve, reject, or edit expense decisions.
- A Driver submission adds an unread Admin notification so it can be reviewed in the existing approval workflow.

### 4.7 Documents and renewals

The documents page gathers dated vehicle and driver documents into an expiry overview. It groups expired or soon-to-expire records for attention and identifies valid records.

- A document is treated as expired when its expiry date is before today.
- A document expiring within 30 days is marked for renewal.
- A document with more than 30 days remaining is shown as valid.
- The overview includes vehicle documents and driver licenses for which expiry dates are recorded.

This is a tracking and reminder view; it does not renew or submit documents to an external authority.

### 4.8 Reports and analytics

The reports page presents:

- Fleet-wide revenue, expenses, net profit, and profit margin.
- A six-month earnings-versus-expenses chart.
- Per-car revenue, expense, profit, and margin comparisons.
- Approved expense totals by category.
- Driver trip counts and fare earnings.
- Salary information for active drivers.

**Period-selector limitation:** Weekly, monthly, yearly, and all-time selector buttons are present, but the current report calculations remain aggregate and are not filtered by the selected period. The monthly chart displays the stored six-month data.

### 4.9 Owner profile

The owner can review the business profile and fleet summary, navigate to the main management areas, and edit owner name, business name, phone, email, and city. In authenticated mode, the profile also provides sign-out.

## 5. Data and business rules

The owner-specific fleet dataset includes an owner profile, cars, drivers, trips, expenses, maintenance records, notifications, and monthly chart data.

- Fleet-wide net profit is derived as total fleet earnings minus total fleet expenses.
- Vehicle profit is derived from that vehicle's stored earnings and expense totals.
- Trip commission is calculated from fare and the driver's commission percentage; trip net earning is fare less that commission.
- Approved expenses are used in expense-category breakdowns.
- Trip records refer to their associated car and driver where available.
- New Admin accounts start with no cars, drivers, trips, expenses, or maintenance records.
- Driver trip and expense writes are atomic server operations. A Driver trip is always linked to their active assigned car and driver; a Driver expense is always linked to the same and starts pending.
- Demo/sample data is for demonstration only and is not saved to a server.

## 6. Privacy, security, and data handling

- Authentication is handled by Supabase email/password authentication.
- Each owner’s fleet payload is stored in the `fleet_data` table and protected by owner-based row-level security.
- Role mappings are stored in `fleet_access`, are readable only by the mapped user, and cannot be written by application clients. Admins provision users and roles through trusted Supabase administration tools.
- Driver database functions enforce role, assignment, and active-status checks server-side. They accept only the fields needed for trip/expense operations and assign the authenticated driver's identity, status, and car on the server.
- The browser uses only the Supabase publishable/anon key; a service-role key or database password must never be placed in frontend code.
- Customer Aadhaar files are stored in a private bucket with Admin-only owner-folder access policies and a 5 MB file-size limit.
- Aadhaar details are excluded from WhatsApp drafts.
- Customer identity data is optional and should be collected only when needed for the trip.
- The application sends WhatsApp drafts to the external WhatsApp app/site for user review; FleetPro does not directly send the message.

## 7. Deployment and operating modes

- FleetPro is a static web application and can be hosted on GitHub Pages or another compatible static host.
- Supabase provides authentication, fleet-data persistence, and private storage for customer Aadhaar uploads.
- The role migration [database/role-based-access.sql](./database/role-based-access.sql) is required after [database/setup.sql](./database/setup.sql), for both new and existing installations. Each Admin and Driver must be invited and manually mapped in `fleet_access`.
- The app fails closed when an authenticated user has no valid role mapping. Demo mode is an unsaved Admin-only preview and does not provide role-based access.
- When Supabase configuration is absent, or the Supabase client cannot load, FleetPro enters demo mode with sample data and clearly indicates that changes are not saved.
- Durable multi-session fleet data requires a configured Supabase project and a working network connection.

## 8. Current limitations and out of scope

The following are not supported by the current application:

- Public self-service registration or additional roles/permissions beyond Admin and Driver.
- In-app user invitation, role assignment, or driver-to-record linking.
- Driver access to the dashboard, all-fleet reports, documents, other drivers' records, or customer Aadhaar information.
- Live GPS, dispatch, route optimization, or live trip tracking.
- Automatic document renewal or integration with government/vehicle registries.
- Direct WhatsApp message delivery from FleetPro.
- Period-filtered report calculations despite the presence of period-selector controls.
- Persistent cloud saving in demo mode.

## 9. Acceptance criteria

The current product behavior is considered aligned with this PRD when:

1. A provisioned Admin or Driver can sign in, set or recover a password, and sign out; an unmapped account cannot enter the app.
2. An Admin can access all existing fleet features and only their own fleet; a Driver sees Trips and Expenses only.
3. A Driver can read only their assigned car, own operational driver record, own trips, and own expenses. Direct fleet-row and customer Aadhaar storage access are denied.
4. A new Admin sees an empty fleet with six zeroed monthly chart entries; edits for a configured Admin account are automatically saved with visible save/error status.
5. An Admin can create, view, edit, assign, and manage vehicle and driver records, including the supported status and identity/document fields.
6. An Admin trip records the required route, distance, fare, car, driver, and starting odometer; valid optional customer, Aadhaar, end-odometer, and photo details can also be saved.
7. A Driver can create a trip only for their own active assigned car. The server assigns the associated driver/car, validates trip fields, and updates fleet earnings atomically.
8. A Driver cannot retrieve another driver's trips or customer Aadhaar fields/files, alter car/driver IDs in a trip submission, delete trips, or modify trip status.
9. Car/driver selections in an Admin-created trip synchronize to existing assignments, while allowing the Admin to select a different available car or driver.
10. Aadhaar number validation rejects non-12-digit values, and Aadhaar file uploads reject unsupported formats or files over 5 MB.
11. Aadhaar files are private to the authenticated Admin, and neither Aadhaar numbers nor Aadhaar files are included in WhatsApp drafts.
12. The Admin can inspect trip records and prepare driver/customer WhatsApp drafts without FleetPro sending those messages automatically.
13. A Driver can submit an expense only for their assigned active car. The server assigns the submitting driver and pending status; an Admin notification is created, and no expense total is updated before approval.
14. A Driver can view only their own expense statuses/receipts and cannot approve, reject, or modify them.
15. An Admin can record expenses, review expense statuses, and approve or reject pending items.
16. Vehicle and license expiry dates are grouped as expired, due within 30 days, or valid beyond 30 days.
17. Dashboard and report summaries expose the earnings, expense, trip, vehicle, and driver information described above, with the documented all-time report-selector limitation.
18. If Supabase is unavailable or unconfigured, demo mode is clearly identified and does not imply that changes have been persisted.
