/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Ancien nom Supabase (JWT « anon public ») */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Nouveau nom Supabase (« publishable key », sb_publishable_…) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SPACE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
