import { supabase } from './supabase';

export type LeadershipRole = 'president_vp' | 'officer' | 'member';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';
export type OfficerPosition = 'moderator' | 'secretary' | 'treasurer' | 'auditor' | 'editor_media';

export type LeadershipAccount = {
  user_id: string;
  username: string;
  full_name: string;
  unit_name: string;
  unit: string;
  age: number;
  address: string;
  gender: string;
  contact_number: string;
  role: LeadershipRole;
  position: 'president' | 'vice_president' | null;
  officer_position: OfficerPosition | null;
  approval_status: ApprovalStatus;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type OfficerAccountInput = {
  officer_position: OfficerPosition;
  username: string;
  full_name: string;
  unit_name: string;
  unit: string;
  age: number;
  address: string;
  gender: string;
  contact_number: string;
  password: string;
  confirm_password: string;
};

export async function leadershipRequest<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('leadership-accounts', { body });
  if (error) {
    let message = error.message || 'The leadership request failed.';
    const response = (error as unknown as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.clone().json();
        if (typeof payload?.error === 'string') message = payload.error;
      } catch {
        // Keep the SDK message when the function response is not JSON.
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function getLeadershipAccounts() {
  const result = await leadershipRequest<{
    accounts: LeadershipAccount[];
    total: number;
    pending: number;
    is_president: boolean;
  }>({ action: 'list' });
  return result;
}

export async function createOfficerAccount(input: OfficerAccountInput) {
  return leadershipRequest<{ ok: boolean; approval_status: ApprovalStatus; officer_position: OfficerPosition; message: string }>({
    action: 'create_officer',
    ...input,
  });
}

export async function reviewOfficerAccount(
  userId: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  return leadershipRequest<{ ok: boolean; message: string }>({
    action: 'review_officer',
    user_id: userId,
    decision,
    note: note ?? '',
  });
}

export async function updateLeadershipManagedRole(userId: string, role: 'member' | 'officer', officerPosition?: OfficerPosition) {
  return leadershipRequest<{ ok: boolean; message: string }>({
    action: 'update_role',
    user_id: userId,
    role,
    officer_position: officerPosition ?? null,
  });
}
