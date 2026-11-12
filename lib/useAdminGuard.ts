import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';

export type AdminProfile = {
  user_id: string;
  full_name: string;
  username: string;
  role: 'admin';
};

export function useAdminGuard() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          if (active) router.replace('/login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, role')
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (error || !data || data.role !== 'admin') {
          if (active) router.replace('/');
          return;
        }

        if (active) setProfile(data as AdminProfile);
      } catch {
        if (active) router.replace('/login');
      } finally {
        if (active) setChecking(false);
      }
    };

    void verify();
    return () => { active = false; };
  }, [router]);

  return { profile, checking };
}
