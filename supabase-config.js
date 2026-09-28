const SUPABASE_URL = 'https://pegchusrvznfaprseghv.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_361AfRQuV5iY31_k0kJ17Q__VFU_qfp';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
