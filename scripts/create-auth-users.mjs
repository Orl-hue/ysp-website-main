import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceKey);

const users = [
  { email: 'admin@ysp.ph', password: 'admin123' },
  { email: 'chapter@ysp.ph', password: 'chapter123' },
];

for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (error) {
    console.error(user.email, error.message);
  } else {
    console.log('Created:', data.user.email, data.user.id);
  }
}
