import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { uploadDoctorImage, deleteDoctorImage } from '@/utils/storage';
import { requireRole } from '@/utils/auth';

// GET: Fetch all doctors (public, used by /doctors page)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get('specialization');

    let query = supabaseAdmin
      .from('doctors')
      .select('*')
      .order('full_name', { ascending: true });

    if (specialization) {
      query = query.eq('specialization', specialization);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET doctors error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add a new doctor (admin only)
export async function POST(request) {
  // Check authentication and authorization in one call (avoids double auth check)
  const { user, response: authError } = await requireRole(request, ['admin']);

  if (authError) {
    return authError;
  }

  try {
    const contentType = request.headers.get('content-type');
    const userId = user?.id;

    let body;
    let imageFile = null;

    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {};

      // Extract text fields
      for (const [key, value] of formData.entries()) {
        if (key !== 'image') {
          body[key] = value;
        } else {
          imageFile = value;
        }
      }
    } else {
      body = await request.json();
    }

    const { full_name, specialization, qualification, experience_years, bio, available_days } = body;

    // Validate required fields
    if (!full_name || !specialization) {
      return NextResponse.json(
        { success: false, error: 'Full name and specialization are required' },
        { status: 400 }
      );
    }

    // First create the doctor record without image
    // This ensures we have a valid doctor ID before handling image upload
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .insert({
        full_name,
        specialization,
        qualification,
        experience_years: experience_years ? parseInt(experience_years) : null,
        bio,
        available_days
      })
      .select()
      .single();

    if (doctorError) {
      return NextResponse.json(
        { success: false, error: doctorError.message },
        { status: 400 }
      );
    }

    // Handle image upload if provided (now that we have a valid doctor ID)
    let imageUrl = body.image_url;
    let uploadedImagePath = null;

    if (imageFile && doctorData) {
      const uploadResult = await uploadDoctorImage(imageFile, doctorData.id);

      if (uploadResult.success) {
        imageUrl = uploadResult.publicUrl;
        uploadedImagePath = uploadResult.filePath;

        // Update the doctor record with the image URL
        const { error: updateError } = await supabaseAdmin
          .from('doctors')
          .update({ image_url: imageUrl })
          .eq('id', doctorData.id);

        if (updateError) {
          // If update fails, try to clean up the uploaded image
          console.error('Failed to update doctor with image URL:', updateError);
          if (uploadedImagePath) {
            await deleteDoctorImage(uploadedImagePath).catch(err =>
              console.error('Failed to clean up uploaded image:', err)
            );
          }
        }
      }
    }

    // Log the action for audit
    await logAction(userId, 'created_doctor', doctorData.id, 'doctors');

    // Return the final doctor data (with image URL if uploaded)
    return NextResponse.json({
      success: true,
      data: {
        ...doctorData,
        image_url: imageUrl || doctorData.image_url
      }
    });
  } catch (error) {
    console.error('POST doctor error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
