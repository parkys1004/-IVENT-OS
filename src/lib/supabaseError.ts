import { supabase } from '../supabase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
  }
}

export function handleSupabaseError(error: any, operationType: string, table: 'events' | 'profiles' | 'registrations' | 'promo_banners' | 'settings' | 'user_followers' | 'parties' | 'lessons', userId?: string) {
  let errorMessage = 'Unknown error';

  if (error) {
    if (typeof error === 'object') {
      // Handle Supabase PostgrestError or standard Error objects
      errorMessage = error.message || error.details || JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
  }

  const errInfo: SupabaseErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: userId,
      email: undefined,
    },
    operationType: operationType as any,
    table
  }
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  return errInfo;
}
