import { supabaseAdmin } from './supabaseAdmin';

/**
 * Log an action for DPDPA compliance audit trail
 * @param {string|null} userId - The user performing the action (null for system actions)
 * @param {string} action - The action being performed (e.g., 'viewed_patient', 'updated_record')
 * @param {string|null} targetId - The ID of the record being accessed/modified
 * @param {string|null} targetTable - The name of the table being accessed/modified
 */
export async function logAction(userId, action, targetId, targetTable) {
    try {
        const { error } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                user_id: userId,
                action,
                target_id: targetId,
                target_table: targetTable
            });

        if (error) {
            console.error('Audit log error:', error);
        }
    } catch (error) {
        console.error('Audit log exception:', error);
    }
}
