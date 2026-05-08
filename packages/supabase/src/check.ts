import { readSupabaseStatus, supabaseForbiddenStores } from "./index";
console.log(JSON.stringify({ status: readSupabaseStatus(), forbidden: supabaseForbiddenStores }, null, 2));
