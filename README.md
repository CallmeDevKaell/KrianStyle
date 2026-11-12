# KrianStyle Mobile App

An Expo + React Native starter for the KrianStyle community landing page.

## Stack

- Expo SDK 57 + Expo Router
- React Native + TypeScript
- Supabase JS client connected to the existing **KrianStyle Website** project
- Existing Supabase publishable key only (no service-role key in the app)

## Run locally

1. Install Node.js LTS (Node 22.13+ is suitable for Expo SDK 57).
2. Extract this folder and open it in VS Code.
3. Open a terminal in this folder and run:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code using Expo Go. If Expo Go on your device does not support SDK 57, update Expo Go or use an SDK 57-compatible development build.

## Supabase connection

The `.env.local` file is preconfigured with the existing KrianStyle Supabase Project URL and publishable key. It is ignored by Git. Do not replace the publishable key with a database password or service-role/secret key.

Supabase project: `KrianStyle Website`
Project reference: `bzzsdijhozulzvbgtfak`
Region: `ap-northeast-1`

The app has a ready-to-use client at `lib/supabase.ts`. The landing page does not query or modify database tables yet. The existing project's `public` schema was checked and had no tables at the time this starter was prepared.

## Current first screen

- KrianStyle main logo in the header and hero
- Bohol Zone / District 3 – Carmen Zone logo
- Black, violet, and yellow brand palette
- Hero section with working scroll buttons
- Zone identity section
- Brotherhood, respect, and passion values
- Community closing section

## Notes

The two supplied JPEG logos are kept in `assets/`. Replace them only when you have a higher-resolution official artwork or transparent PNG version.
