import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { success: false, message: 'No autorizado' });
    }

    const payload = await req.json().catch(() => ({}));
    const userId = typeof payload?.user_id === 'string' ? payload.user_id : String(payload?.user_id || '');

    if (!userId) {
      return jsonResponse(400, { success: false, message: 'user_id requerido' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { success: false, message: 'Faltan variables de entorno de Supabase' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(401, { success: false, message: 'Token inválido' });
    }

    if (user.id !== userId) {
      return jsonResponse(403, { success: false, message: 'No autorizado para eliminar esta cuenta' });
    }

    const tablesToClean = [
      { table: 'historial', column: 'user_id' },
      { table: 'rutinas_usuario', column: 'user_id' },
      { table: 'dias_usuario', column: 'user_id' },
      { table: 'profiles', column: 'id' },
    ];

    for (const { table, column } of tablesToClean) {
      try {
        const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
        if (error) {
          const message = String(error.message || '').toLowerCase();
          if (!message.includes('does not exist') && !message.includes('relation') && !message.includes('not found')) {
            throw error;
          }
        }
      } catch (cleanupError) {
        console.error(`Cleanup error for ${table}:`, cleanupError);
        throw cleanupError;
      }
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      throw deleteAuthError;
    }

    return jsonResponse(200, {
      success: true,
      message: 'Cuenta eliminada correctamente',
    });
  } catch (error) {
    console.error('delete-user failed', error);
    const message = error instanceof Error ? error.message : 'Error eliminando la cuenta';
    return jsonResponse(500, {
      success: false,
      message,
    });
  }
});
