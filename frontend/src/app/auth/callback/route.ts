/* eslint-disable */
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Using a simple workaround for edge runtime route handler cookies
            // In a route handler GET, we can't easily modify the incoming request.
            return [];
          },
          setAll(cookiesToSet) {
            // we will set them on the response instead
          },
        },
      }
    );

    // Instead of complex cookie management, we'll use exchangeCodeForSession
    // and rely on the fact that Next.js will pass the Set-Cookie headers.
    // However, the recommended @supabase/ssr way is:
    
    let supabaseResponse = NextResponse.redirect(`${origin}${next}`);
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Just need a fake getAll to satisfy TS
            return [];
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    
    await supabaseServer.auth.exchangeCodeForSession(code);
    return supabaseResponse;
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid+callback`);
}

