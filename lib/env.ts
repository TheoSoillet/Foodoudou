function normalize(value: string | undefined): string {
  if (value == null || value === '') return '';
  const trimmed = value.trim();
  // Strip surrounding quotes if present (handles any .env format)
  if (trimmed.length >= 2) {
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function requireEnv(value: string, key: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}. Add it to .env.local in the project root. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_MAPBOX_TOKEN`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv(normalize(process.env.NEXT_PUBLIC_SUPABASE_URL), 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv(
    normalize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ),
  mapboxToken: requireEnv(normalize(process.env.NEXT_PUBLIC_MAPBOX_TOKEN), 'NEXT_PUBLIC_MAPBOX_TOKEN')
};
