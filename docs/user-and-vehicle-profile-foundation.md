# PienoSmart User And Vehicle Profile Foundation

## Purpose

This document explains the user foundation and vehicle profile model introduced before favorites and full authentication.

It answers:

- why the app needs a user entity before favorites and profiles become useful
- which fields exist on `app_users` and why
- which fields exist on `vehicle_profiles` and why
- how default vehicle selection works
- how the current development identity flow works today
- how this design prepares the backend for later real authentication

This document is meant to be both:

- a product/architecture explanation
- an implementation reference for backend work

## Why A User Foundation Is Needed First

Favorites, vehicle profiles, and alerts are all personal data.

They are not global application data.

That means:

- a favorite station belongs to a specific person
- a vehicle profile belongs to a specific person
- a default vehicle belongs to a specific person
- later, alerts and route preferences will also belong to a specific person

Without a user identity, the backend cannot safely answer:

- whose favorites are these?
- which default profile should be used for recommendation?
- which alerts should be evaluated?
- which saved preferences should be restored on a second device?

So before implementing real profile CRUD and favorites, the backend needs a stable user owner model.

## Design Principle

PienoSmart should treat user-owned entities as server-side resources with explicit ownership.

That means:

- `app_users` is the owner root
- `vehicle_profiles` belong to one user
- `favorites` belong to one user
- `alerts` belong to one user

This makes future authentication and authorization much easier, because user-scoped data already has the correct shape.

## Entity Relationships

## Current Relationship Model

- one `app_user` can have many `vehicle_profiles`
- one `app_user` can have many `favorites`
- one `app_user` can have many `alerts`
- one `favorite` references one `station`

So the intended cardinality is:

- `app_users -> vehicle_profiles` = `1:N`
- `app_users -> favorites` = `1:N`
- `stations -> favorites` = `1:N`

### Why Vehicle Profiles Are Not `N:M`

Vehicle profiles should not be modeled as shared objects across users.

Even if two users both drive diesel cars, the profile is still personal because it includes:

- name chosen by the user
- preferred service mode
- preferred brands
- excluded brands
- default status
- later, behavioral preferences

So the correct model is:

- each vehicle profile belongs to exactly one user

not:

- users and vehicles in a many-to-many relationship

## Why Default Vehicle Belongs On The User

The canonical default vehicle should be stored on the user:

- `app_users.default_vehicle_profile_id`

This is better than relying only on `vehicle_profiles.is_default`.

### Why

Because a user has exactly one active default profile at a time.

That concept is fundamentally:

- a property of the user

not:

- a property of multiple vehicle rows competing with each other

### Practical Advantages

Using `app_users.default_vehicle_profile_id` gives:

- one source of truth
- simpler recommendation defaults
- simpler future auth integration
- easier enforcement of “at most one default”

The `vehicle_profiles.is_default` field can still exist for response convenience, but the authoritative pointer should remain on the user.

## App User Model

Current file:

- [backend/app/models/user.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/models/user.py)

## Fields And Why They Exist

### `id`

- UUID primary key

Why:

- stable internal identifier
- safe to expose in API payloads later
- consistent with profiles, favorites, and alerts

### `email`

- optional unique email

Why:

- useful as a human-facing identifier
- useful for future auth systems
- useful for support and account linking

Optional because:

- the app can still operate in development or staged auth modes without requiring email first

### `display_name`

- optional human-friendly user name

Why:

- useful for profile and account surfaces
- useful for future UX without overloading `email`

### `external_auth_subject`

- optional unique external identity subject

Why:

- this is the most stable future bridge to real authentication
- external auth systems usually provide a subject or principal identifier
- email can change; subject should not

This field is the right place to connect the local user row to a real identity provider later.

### `is_active`

- boolean active flag

Why:

- soft account disable support
- future operational control
- allows the backend to reject actions from deactivated accounts without deleting data

### `default_vehicle_profile_id`

- nullable foreign key to `vehicle_profiles.id`

Why:

- tells recommendation logic which profile to use by default
- avoids expensive or ambiguous default resolution rules
- makes “one default profile per user” explicit

## Vehicle Profile Model

Current file:

- [backend/app/models/profile.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/models/profile.py)

## Fields And Why They Exist

### `id`

- UUID primary key

Why:

- stable API-safe identifier

### `user_id`

- foreign key to `app_users.id`

Why:

- ownership
- future authorization
- enables per-user profile listing and isolation

### `name`

- human-friendly label such as:
  - `Daily Diesel`
  - `Trip GPL`
  - `Family Car`

Why:

- users may own multiple vehicles or multiple usage contexts
- the profile must be identifiable in UI

### `fuel_type`

- canonical fuel enum

Why:

- recommendation cannot work without knowing which fuel matters
- this is the most important profile signal

### `avg_consumption_l_per_100km`

- numeric positive value

Why:

- useful later for better recommendation and route logic
- can support travel-cost reasoning or fuel planning in future iterations

Even if V1 recommendation does not fully exploit it yet, it is a reasonable MVP field because it is stable and domain-relevant.

### `tank_capacity_liters`

- optional numeric field

Why:

- useful later for route-aware or refill-planning scenarios
- not required for simple nearby ranking

### `preferred_service_mode`

- `self`, `servito`, or `unknown`

Why:

- many users have a strong preference here
- recommendation should not force the user to specify this every time

### `preferred_brands`

- list of preferred brands

Why:

- supports future profile-aware ranking
- some users trust or prefer specific brands

### `excluded_brands`

- list of brands the user wants to avoid

Why:

- lets recommendation logic avoid low-trust or unwanted stations later

### `is_default`

- boolean convenience field

Why:

- makes response payloads easier to consume
- UI can show which returned profile is currently default

Important:

- this is not the canonical source of truth
- `app_users.default_vehicle_profile_id` is the canonical default selector

## Favorite Model

Current file:

- [backend/app/models/profile.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/models/profile.py)

Fields:

- `id`
- `user_id`
- `station_id`
- `created_at`

Constraint:

- unique `(user_id, station_id)`

Why:

- one user should not favorite the same station twice
- favorites are a user-station relationship, not a station property

## Current Development Identity Flow

Current dependency:

- [backend/app/api/deps.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/api/deps.py)

## How It Works Today

There is no full authentication system yet.

Instead, the backend supports a development identity mechanism:

- `X-Dev-User-Email`
- `X-Dev-User-Display-Name`
- `X-Dev-User-Subject`

If those headers are missing, the backend falls back to configured defaults from:

- [backend/app/core/config.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/core/config.py)
- [backend/.env.example](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/.env.example)

Then the dependency:

1. looks up an existing `app_user` by `external_auth_subject` first
2. falls back to `email` if no subject is provided
3. creates the user if missing
4. updates missing identity fields if needed
5. rejects the request if `is_active = false`

This is a practical bridge because it lets us:

- build user-owned features now
- keep the API shape stable
- replace dev identity with real auth later without redesigning ownership

## Current User API

Current route:

- [backend/app/api/routes/users.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/api/routes/users.py)

Available endpoint:

- `GET /api/users/me`

Purpose:

- expose the resolved current user
- give the frontend a stable identity surface
- expose `default_vehicle_profile_id`

This is useful even before full login exists.

## Vehicle Profile CRUD Semantics

Current route:

- [backend/app/api/routes/vehicle_profiles.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/api/routes/vehicle_profiles.py)

Current service:

- [backend/app/profiles/service.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/profiles/service.py)

## Endpoints

- `GET /api/vehicle-profiles`
- `POST /api/vehicle-profiles`
- `PATCH /api/vehicle-profiles/{id}`
- `DELETE /api/vehicle-profiles/{id}`

## Default Profile Rules

The backend currently enforces these rules:

### On create

- if it is the first profile for the user, it becomes default automatically
- if request sets `is_default=true`, it becomes the new default

### On update

- if request sets `is_default=true`, that profile becomes the new default
- if request sets `is_default=false` on the current default:
  - the backend promotes another profile if available
  - otherwise the user ends up with no default

### On delete

- if a non-default profile is deleted:
  - default remains unchanged
- if the default profile is deleted:
  - another remaining profile is promoted deterministically
  - if none remain, `default_vehicle_profile_id` becomes `null`

### On read

- `GET /api/vehicle-profiles` returns:
  - `items`
  - `default_vehicle_profile_id`
- each profile item also exposes `is_default`

## Why This Matters For Recommendation

Recommendation should not force the client to always pass:

- `fuel_type`
- `preferred_service_mode`
- brand preferences

If the user has a default vehicle profile, the backend can later use it to supply:

- default fuel type
- default service mode preference
- preferred or excluded brand hints

This makes recommendation behavior:

- more personal
- more efficient
- more stable across sessions

## Why This Matters For Favorites

Favorites should be user-owned because:

- saved stations are personal
- route stop history or pinned stations are personal
- favorite visibility must not leak between users

That means favorites should always be resolved in the context of:

- current user

not:

- global station state

## Why This Matters For Future Authentication

The current design is intentionally auth-ready.

When real authentication is introduced later:

- replace dev headers with a real token/session layer
- map the external identity to `external_auth_subject`
- keep the existing `app_users` row as the backend owner record

This means:

- favorites do not need redesign
- vehicle profiles do not need redesign
- alerts do not need redesign
- recommendation ownership logic does not need redesign

That is the main reason to introduce the user foundation now instead of later.

## Suggested Future Auth Shape

When auth is added, the current-user dependency should evolve from:

- dev headers / env fallback

to:

- bearer token or session validation
- extract identity subject from provider
- resolve or create `app_user`
- return current app user

The rest of the data model should remain the same.

## Recommended Next Steps

After this foundation, the natural sequence is:

1. finish vehicle profile CRUD
2. add favorites CRUD
3. wire `vehicle_profile_id` into recommendation defaults
4. later replace dev identity with real authentication

## Summary

The user foundation is necessary because PienoSmart is no longer only serving public search data.

As soon as the product supports:

- favorites
- profiles
- alerts
- personalized recommendation

it needs a real ownership model.

The current design achieves that with:

- `app_users` as the owner root
- `vehicle_profiles` as `1:N` user-owned resources
- `favorites` as user-station relationships
- `app_users.default_vehicle_profile_id` as the canonical default vehicle pointer
- a temporary but stable development identity flow that can later be replaced by real authentication
