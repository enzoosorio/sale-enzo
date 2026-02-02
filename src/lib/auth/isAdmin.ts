'use server';
import { createClient } from "@/utils/supabase/server";

/**
 * Server-side function to check if the current authenticated user is an admin.
 * 
 * Uses the Postgres function `is_admin()` which checks:
 * SELECT (auth.jwt() ->> 'role') = 'admin'
 * 
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    // Call the is_admin() function from Postgres
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Unexpected error in isAdmin:', error);
    return false;
  }
}

/**
 * Server-side function to get the current user's ID if they are an admin.
 * Returns null if user is not authenticated or not an admin.
 * 
 * @returns Promise<string | null> - User ID if admin, null otherwise
 */
export async function getAdminUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase.rpc('is_admin');
    
    if (error || data !== true) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Unexpected error in getAdminUserId:', error);
    return null;
  }
}
