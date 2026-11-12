import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';

export type LeadershipProfile = {
  user_id: string;
  username: string;
  full_name: string;
  role: 'president_vp';
  position: 'president' | 'vice_president';
  approval_status: 'approved';
};

export function useLeadershipGuard() {
  const router = useRouter();
  const [profile, setProfile] = useState<LeadershipProfile | null>(null);
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
          .select('user_id, username, full_name, role, position, approval_status')
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (error || !data || data.role !== 'president_vp' || data.approval_status !== 'approved' || !['president', 'vice_president'].includes(data.position ?? '')) {
          if (active) router.replace(data?.role === 'admin' ? '/admin' : '/');
          return;
        }

        if (active) setProfile(data as LeadershipProfile);
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
