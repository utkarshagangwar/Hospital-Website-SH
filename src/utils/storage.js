'use server';

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SERVER-ONLY MODULE GUARD
// This module uses the service role key and must NEVER be imported client-side
// ============================================================================
if (typeof window !== 'undefined') {
    throw new Error(
        'storage.js is a server-only module and cannot be used in the browser. ' +
        'This error indicates the service role key may be at risk of exposure. ' +
        'Only import this module from API routes or server components.'
    );
}

// Lazy initialization variables
let supabaseAdmin = null;
let isInitialized = false;

/**
 * Initialize and return the Supabase admin client with service role key
 * Lazy initialization prevents errors during module load if env vars are missing
 */
function getSupabaseAdmin() {
    if (isInitialized && supabaseAdmin) {
        return supabaseAdmin;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    isInitialized = true;
    return supabaseAdmin;
}

// ============================================================================
// STORAGE BUCKET SETUP INSTRUCTIONS
// ============================================================================
// 
// Go to your Supabase Dashboard > Storage and create the following buckets:
// 
// 1. Bucket Name: "medical-files"
//    - Public: OFF (private bucket)
//    - File size limit: 50MB
//    - Allowed file types: Images, PDFs
//    - Purpose: Lab reports, prescriptions, X-rays
// 
// 2. Bucket Name: "doctor-images"
//    - Public: ON (publicly accessible)
//    - File size limit: 10MB
//    - Allowed file types: Images only
//    - Purpose: Doctor profile photos
// 
// After creating buckets, run these SQL commands in Supabase SQL Editor
// to set up storage policies:
// 
// -- Medical files policies (private)
// CREATE POLICY "Authenticated users can read medical files"
//   ON storage.objects FOR SELECT
//   USING (bucket_id = 'medical-files' AND auth.role() = 'authenticated');
// 
// CREATE POLICY "Staff can manage medical files"
//   ON storage.objects FOR ALL
//   USING (
//     bucket_id = 'medical-files' AND 
//     EXISTS (
//       SELECT 1 FROM profiles 
//       WHERE id = auth.uid() 
//       AND role IN ('admin', 'doctor', 'receptionist')
//     )
//   );
// 
// -- Doctor images policies (public read)
// CREATE POLICY "Anyone can view doctor images"
//   ON storage.objects FOR SELECT
//   USING (bucket_id = 'doctor-images');
// 
// CREATE POLICY "Admins can manage doctor images"
//   ON storage.objects FOR ALL
//   USING (
//     bucket_id = 'doctor-images' AND 
//     EXISTS (
//       SELECT 1 FROM profiles 
//       WHERE id = auth.uid() 
//       AND role = 'admin'
//     )
//   );
// ============================================================================

/**
 * Upload a medical file to the private medical-files bucket
 * @param {File} file - The file object to upload
 * @param {string} patientId - The patient ID for organizing files
 * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
 */
export async function uploadMedicalFile(file, patientId) {
    try {
        const client = getSupabaseAdmin();

        // Sanitize filename
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${patientId}/${Date.now()}_${sanitizedFileName}`;

        // Convert file to array buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await client
            .storage
            .from('medical-files')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, filePath: data.path };
    } catch (error) {
        console.error('Upload exception:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get a signed URL for a medical file (valid for 1 hour)
 * @param {string} filePath - The path of the file in storage
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getMedicalFileUrl(filePath) {
    try {
        const client = getSupabaseAdmin();

        const { data, error } = await client
            .storage
            .from('medical-files')
            .createSignedUrl(filePath, 3600); // 1 hour

        if (error) {
            console.error('Signed URL error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, url: data.signedUrl };
    } catch (error) {
        console.error('Signed URL exception:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upload a doctor profile image to the public doctor-images bucket
 * @param {File} file - The file object to upload
 * @param {string} doctorId - The doctor ID for organizing files
 * @returns {Promise<{success: boolean, publicUrl?: string, filePath?: string, error?: string}>}
 */
export async function uploadDoctorImage(file, doctorId) {
    try {
        const client = getSupabaseAdmin();

        // Sanitize filename
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${doctorId}/${Date.now()}_${sanitizedFileName}`;

        // Convert file to array buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await client
            .storage
            .from('doctor-images')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = client
            .storage
            .from('doctor-images')
            .getPublicUrl(filePath);

        return { success: true, publicUrl: urlData.publicUrl, filePath };
    } catch (error) {
        console.error('Upload exception:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a medical file from the bucket
 * @param {string} filePath - The path of the file to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteMedicalFile(filePath) {
    try {
        const client = getSupabaseAdmin();

        const { error } = await client
            .storage
            .from('medical-files')
            .remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Delete exception:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a doctor image from the bucket
 * @param {string} filePath - The path of the file to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDoctorImage(filePath) {
    try {
        const client = getSupabaseAdmin();

        const { error } = await client
            .storage
            .from('doctor-images')
            .remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Delete exception:', error);
        return { success: false, error: error.message };
    }
}
