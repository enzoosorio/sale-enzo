'use server';
import { createClient } from "@/utils/supabase/server";

export const getUserById = async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('users')
    .select('*')
    .eq('id', userId)
    .single();
    if (error) {
        console.error('Error fetching user by ID:', error);
        return null;
    }
    return data;
};