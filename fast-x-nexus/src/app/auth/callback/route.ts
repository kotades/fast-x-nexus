import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/'; // Default to root, middleware will redirect based on role

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Set cookie on the incoming request so the client has it
                request.cookies.set(name, value);
                // Set cookie on the outgoing response so the browser saves it
                response.cookies.set({ name, value, ...options });
              });
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        // Successful exchange, cookies have been attached to the response
        return response;
      }
    } catch (err) {
      console.error('Session exchange failed defensively:', err);
    }
  }

  // Fallback if no code or an error occurs
  return NextResponse.redirect(`${origin}/login?error=oauth_fallback_failed`);
}
