import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json().catch(() => ({ email: '' }));
    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const tenantId = Deno.env.get('MS_OAUTH_TENANT_ID') || 'common';
    const clientId = Deno.env.get('MS_OAUTH_CLIENT_ID');
    const redirectUri = Deno.env.get('MS_OAUTH_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return Response.json({ error: 'Microsoft OAuth is not configured on the server.' }, { status: 503 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'offline_access openid profile email Mail.Read Mail.Send User.Read',
      login_hint: email,
    });

    return Response.json({
      url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'OAuth bootstrap failed' }, { status: 500 });
  }
});
