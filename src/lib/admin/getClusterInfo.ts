'use server';
import { createClient } from "@/utils/supabase/server";

export interface ClusterInfo {
    id: string;
    centroid_l: number;
    centroid_a: number;
    centroid_b: number;
    color_count: number;
    representative_hex: string;
    created_at: string;
    updated_at: string;
    is_locked: boolean;
    is_hidden: boolean;
    label: string | null;
    weighted_count: number;
    suggested_label: string | null;
}

export const getClustersInfo = async (): Promise<ClusterInfo[]> => {
    const supabase = await createClient();

    const { data: clusters, error } = await supabase
        .from('variant_color_categories')
        .select('*')
        .order('color_count', { ascending: false });

    if (error) {
        console.error("Error fetching clusters:", error);
        return [];
    }

    return clusters || [];
}