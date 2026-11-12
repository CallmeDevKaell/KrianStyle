import { supabase } from './supabase';

export type AccountRole = 'admin' | 'president_vp' | 'officer' | 'member';
export type LeadershipPosition = 'president' | 'vice_president' | null;

export type AdminAccount = {
  user_id: string;
  username: string;
  full_name: string;
  unit_name: string;
  unit: string;
  age: number;
  address: string;
  gender: string;
  contact_number: string;
  role: AccountRole;
  position: LeadershipPosition;
  created_at: string;
  is_suspended: boolean;
  last_sign_in_at: string | null;
};

export async function adminRequest<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-accounts', { body });
  if (error) {
    let message = error.message || 'The admin request failed.';
    const response = (error as unknown as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.clone().json();
        if (typeof payload?.error === 'string') message = payload.error;
      } catch {
        // Keep the SDK message when the response body is not JSON.
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function getAdminAccounts() {
  const result = await adminRequest<{ accounts: AdminAccount[]; total: number }>({ action: 'list' });
  return result.accounts ?? [];
}
