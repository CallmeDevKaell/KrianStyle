import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';

export type OfficerPosition = 'moderator' | 'secretary' | 'treasurer' | 'auditor' | 'editor_media';

export type OfficerProfile = {
  user_id: string;
  username: string;
  full_name: string;
  role: 'officer';
  officer_position: OfficerPosition;
  approval_status: 'approved';
};

export function useOfficerGuard(requiredPosition?: OfficerPosition) {
  const router = useRouter();
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
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
          .select('user_id, username, full_name, role, officer_position, approval_status')
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (error || !data || data.role !== 'officer' || data.approval_status !== 'approved' || !data.officer_position) {
          if (active) {
            router.replace(data?.role === 'admin' ? '/admin' : data?.role === 'president_vp' ? '/leadership' : '/login');
          }
          return;
        }

        if (requiredPosition && data.officer_position !== requiredPosition) {
          if (active) router.replace('/officer');
          return;
        }

        if (active) setProfile(data as OfficerProfile);
      } catch {
        if (active) router.replace('/login');
      } finally {
        if (active) setChecking(false);
      }
    };

    void verify();
    return () => { active = false; };
  }, [router, requiredPosition]);

  return { profile, checking };
}
