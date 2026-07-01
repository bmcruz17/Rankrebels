// GET /api/agreement/get?token=<uuid>
// Returns the fields needed to render the countersign page and the read-only executed
// copy. The token is a secret unguessable UUID, so this acts as a share link.
import { getByToken, json } from './_util.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const a = await getByToken(env, token);
  if (!a) return json({ error: 'Not found' }, 404);
  return json({
    ok: true,
    agreement: {
      business_name: a.business_name,
      contact_name: (a.snapshot && a.snapshot.contact) || null,
      client_email: a.client_email,
      signer_name: a.signer_name,
      signed_at: a.signed_at,
      status: a.status,
      countersigned_by: a.countersigned_by,
      countersigned_at: a.countersigned_at,
      setup_fee: a.setup_fee,
      monthly_fee: a.monthly_fee,
      terms_version: a.terms_version,
      snapshot: a.snapshot,
    },
  });
}
