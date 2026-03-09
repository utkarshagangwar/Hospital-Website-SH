import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { uploadDoctorImage } from '@/utils/storage';
import { requireRole } from '@/utils/auth';

// GET: Fetch single doctor profile (public)
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET doctor error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update doctor info (admin only)
export async function PATCH(request, { params }) {
  // Check authentication and authorization in one call (avoids double auth check)
  const { user, response: authError } = await requireRole(request, ['admin']);

  if (authError) {
    return authError;
  }

  try {
    const { id } = params;
    const userId = user?.id;
    const contentType = request.headers.get('content-type');

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

    const { full_name, specialization, qualification, experience_years, bio, available_days, image_url } = body;

    // Check if doctor exists
    const { data: existing } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (specialization) updateData.specialization = specialization;
    if (qualification) updateData.qualification = qualification;
    if (experience_years) updateData.experience_years = parseInt(experience_years);
    if (bio) updateData.bio = bio;
    if (available_days) updateData.available_days = available_days;

    // Handle image upload if provided
    if (imageFile) {
      const uploadResult = await uploadDoctorImage(imageFile, id);
      if (uploadResult.success) {
        updateData.image_url = uploadResult.publicUrl;
      }
    } else if (image_url !== undefined) {
      updateData.image_url = image_url;
    }

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Log the action for audit
    await logAction(userId, 'updated_doctor', id, 'doctors');

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PATCH doctor error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove doctor (admin only)
export async function DELETE(request, { params }) {
  // Check authentication and authorization in one call (avoids double auth check)
  const { user, response: authError } = await requireRole(request, ['admin']);

  if (authError) {
    return authError;
  }

  try {
    const { id } = params;
    const userId = user?.id;

    // Check if doctor exists
    const { data: existing } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from('doctors')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Log the action for audit
    await logAction(userId, 'deleted_doctor', id, 'doctors');

    return NextResponse.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('DELETE doctor error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
