import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('hosting_servers').insert([{
      name: 'Test Server Delete',
      ip: '127.0.0.1',
      location: 'Local'
  }]);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
