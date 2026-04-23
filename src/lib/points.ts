import { supabase } from '../supabase';

export interface PointPolicy {
  action: string;
  amount: number;
  description: string;
}

export const DEFAULT_POINT_POLICIES = {
  booking_reward_percent: 5, // 5% of price
  early_bird_bonus: 500,
  community_post: 100,
  community_comment: 20,
  best_post_bonus: 2000,
  event_review: 200,
  event_photo_upload: 300,
  daily_max_comment_reward: 5, // max 5 comments rewarded per day
  party_registration_cost: 300,
  lesson_registration_cost: 300,
};

/**
 * Earn points for a user
 * Note: This should ideally be handled by a secure server-side function (Edge Function)
 * but for this environment, we'll implement it as client-side calls.
 * REAL APP WARNING: Client-side point modification is insecure. 
 * Use Supabase RPC or Edge Functions in production.
 */
export async function awardPoints(userId: string, amount: number, reason: string, metadata: any = {}) {
  try {
    // 1. Get current user profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    if (pErr) throw pErr;

    const newPoints = (profile.points || 0) + amount;

    // 2. Update profile points
    const { error: uErr } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);
    
    if (uErr) throw uErr;

    // 3. Record in history
    const { error: hErr } = await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        amount,
        reason,
        metadata
      });
    
    if (hErr) throw hErr;

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error };
  }
}

/**
 * Spend points
 */
export async function spendPoints(userId: string, amount: number, reason: string, metadata: any = {}) {
  try {
    // 1. Get current user profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    if (pErr) throw pErr;

    if ((profile.points || 0) < amount) {
      throw new Error('포인트가 부족합니다.');
    }

    const newPoints = (profile.points || 0) - amount;

    // 2. Update profile points
    const { error: uErr } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);
    
    if (uErr) throw uErr;

    // 3. Record in history
    const { error: hErr } = await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        amount: -amount,
        reason,
        metadata
      });
    
    if (hErr) throw hErr;

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error spending points:', error);
    return { success: false, error };
  }
}
