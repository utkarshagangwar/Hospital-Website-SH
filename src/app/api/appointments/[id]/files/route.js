import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const BUCKET = 'medical-files';

// GET: List all files uploaded for this appointment (by storage path prefix)
export async function GET(request, { params }) {
    try {
        const { id } = params;

        // List files in bucket under the appointment's folder
        const { data: storageFiles, error: listError } = await supabaseAdmin
            .storage
            .from(BUCKET)
            .list(id, { limit: 100, offset: 0 });

        if (listError) {
            // Folder doesn't exist yet → no files
            return NextResponse.json({ success: true, data: [] });
        }

        if (!storageFiles || storageFiles.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Generate signed URLs for each file (valid 1 hour)
        const filesWithUrls = [];
        for (const file of storageFiles) {
            if (file.name === '.emptyFolderPlaceholder') continue;

            const filePath = `${id}/${file.name}`;
            const { data: signedData, error: signedError } = await supabaseAdmin
                .storage
                .from(BUCKET)
                .createSignedUrl(filePath, 3600);

            filesWithUrls.push({
                id: filePath,       // use filePath as unique key (no DB record needed)
                fileName: file.name,
                filePath,
                signedUrl: signedError ? null : signedData.signedUrl,
            });
        }

        return NextResponse.json({ success: true, data: filesWithUrls });
    } catch (error) {
        console.error('GET appointment files error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Upload a file for an appointment
export async function POST(request, { params }) {
    try {
        const { id } = params;

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file size (10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File exceeds 10MB limit' },
                { status: 400 }
            );
        }

        // Sanitize filename and build storage path: medical-files/{appointment_id}/{filename}
        const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `${id}/${sanitizedFileName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json(
                { success: false, error: uploadError.message },
                { status: 400 }
            );
        }

        // Optionally insert into medical_records if appointment exists in Supabase
        // (gracefully skipped if appointment is localStorage-only)
        try {
            const { data: appointment } = await supabaseAdmin
                .from('appointments')
                .select('patient_id, appointment_date, doctor_id')
                .eq('id', id)
                .single();

            if (appointment) {
                await supabaseAdmin
                    .from('medical_records')
                    .insert({
                        patient_id: appointment.patient_id,
                        file_url: uploadData.path,
                        visit_date: appointment.appointment_date,
                        doctor_id: appointment.doctor_id,
                    });
            }
        } catch (_) {
            // Appointment not in Supabase — file uploaded, medical_records skipped
        }

        return NextResponse.json({ success: true, filePath: uploadData.path });
    } catch (error) {
        console.error('POST appointment file error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a file by storage path
export async function DELETE(request) {
    try {
        const body = await request.json();
        const { filePath } = body;

        if (!filePath) {
            return NextResponse.json(
                { success: false, error: 'filePath is required' },
                { status: 400 }
            );
        }

        const { error: deleteError } = await supabaseAdmin
            .storage
            .from(BUCKET)
            .remove([filePath]);

        if (deleteError) {
            return NextResponse.json(
                { success: false, error: deleteError.message },
                { status: 400 }
            );
        }

        // Optionally clean up medical_records row if recordId provided
        const { recordId } = body;
        if (recordId) {
            await supabaseAdmin
                .from('medical_records')
                .delete()
                .eq('id', recordId);
        }

        return NextResponse.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('DELETE appointment file error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
