import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase configuration is missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Username-only UI: Supabase Auth uses this private, synthetic email internally.
// The .test domain is reserved and is not a real contact email address.
export const usernameToAuthEmail = (username: string) =>
  `${username.trim().toLowerCase()}@accounts.krianstyle.test`;
