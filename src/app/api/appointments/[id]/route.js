import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { requireRole } from '@/utils/auth';

// GET: Fetch single appointment by id (staff only)
export async function GET(request, { params }) {
  // Check authentication and authorization in one call (avoids double auth check)
  const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

  if (authError) {
    return authError;
  }

  try {
    const { id } = params;
    const userId = user?.id;

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:profiles!appointments_doctor_id_fkey(full_name, role, specialization)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Log the action for audit
    await logAction(userId, 'viewed_appointment', id, 'appointments');

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET appointment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update appointment status (staff only)
export async function PATCH(request, { params }) {
  // Check authentication and authorization in one call (avoids double auth check)
  const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

  if (authError) {
    return authError;
  }

  try {
    const { id } = params;
    const userId = user?.id;
    const body = await request.json();
    const { status, notes, appointment_date, appointment_time } = body;

    // Check if appointment exists
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (appointment_date) updateData.appointment_date = appointment_date;
    if (appointment_time) updateData.appointment_time = appointment_time;

    const { data, error } = await supabaseAdmin
      .from('appointments')
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
    await logAction(userId, 'updated_appointment', id, 'appointments');

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PATCH appointment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel appointment (staff only)
export async function DELETE(request, { params }) {
  // Check authentication and authorization in one call (avoids double auth check)
  const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

  if (authError) {
    return authError;
  }

  try {
    const { id } = params;
    const userId = user?.id;

    // Check if appointment exists
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to cancelled
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Log the action for audit
    await logAction(userId, 'cancelled_appointment', id, 'appointments');

    return NextResponse.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    console.error('DELETE appointment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
