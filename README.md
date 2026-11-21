# SWARA - Tahap 1

## Cara Deploy (5-10 menit)
1. Buat repo baru di GitHub, upload SEMUA file ini (jangan hanya index.html).
2. Supabase: buat project > SQL Editor > paste `supabase/001_init.sql` > Run. Auth > Providers > Email aktifkan.
3. Vercel: New Project > Import repo GitHub ini > tambahkan ENV: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY > Deploy.
4. Buka domain Vercel, coba Guest > Create > Generate.

## Keamanan
- GEMINI_API_KEY HANYA di Vercel ENV, jangan di index.html.
- Supabase Service Role JANGAN di frontend.
- RLS aktif: user hanya lihat data miliknya.

## Yang belum aktif (jujur)
- Gemini TTS, Voice Cloning, WebRTC real-time, pembayaran, API publik IdeA1.
- Talk AI nyata aktif setelah GEMINI_API_KEY diisi di Vercel.
