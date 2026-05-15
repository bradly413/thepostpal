import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getLongLivedToken, getPages, getInstagramAccount } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg = req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return NextResponse.redirect(new URL(`/dashboard/settings?meta_error=${encodeURIComponent(msg)}`, req.url));
  }

  // Validate OAuth state parameter to prevent CSRF
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("meta_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?meta_error=Invalid+OAuth+state.+Please+try+connecting+again.", req.url),
    );
  }

  try {
    const { access_token: shortToken } = await exchangeCode(code);
    const { access_token: longToken } = await getLongLivedToken(shortToken);
    const pages = await getPages(longToken);

    if (!pages.length) {
      return NextResponse.redirect(new URL("/dashboard/settings?meta_error=No+Facebook+Pages+found", req.url));
    }

    const page = pages[0];
    const igId = await getInstagramAccount(page.id, page.access_token);

    const publicPayload = {
      connected: true,
      pageName: page.name,
      pageId: page.id,
      igAccountId: igId || null,
      connectedAt: new Date().toISOString(),
    };

    const sensitivePayload = {
      ...publicPayload,
      pageToken: page.access_token,
    };

    const encoded = encodeURIComponent(JSON.stringify(publicPayload));
    const response = NextResponse.redirect(
      new URL(`/dashboard/settings?meta_connected=${encoded}`, req.url),
    );

    response.cookies.set("meta_connection", JSON.stringify(sensitivePayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 60,
      path: "/",
    });

    // Clear the OAuth state cookie after successful validation
    response.cookies.delete("meta_oauth_state");

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(new URL(`/dashboard/settings?meta_error=${encodeURIComponent(msg)}`, req.url));
  }
}
