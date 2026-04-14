import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patch: Record<string, unknown> = {
      outlook_email: '',
      outlook_refresh_token: '',
      outlook_access_token: '',
      outlook_token_expires_at: null,
      updated_date: new Date().toISOString(),
    };

    await base44.auth.updateMe(patch);

    return Response.json({
      success: true,
      disconnected: true,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'OAuth disconnect failed' }, { status: 500 });
  }
});
