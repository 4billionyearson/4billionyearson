import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // If no password is set in env, we allow it for local testing.
  // In production, you MUST set ADMIN_PASSCODE in Vercel to protect the route!
  const password = process.env.ADMIN_PASSCODE;
  
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
       return new NextResponse('Admin Passcode is not configured on the server.', { status: 500 });
    }
    return NextResponse.next();
  }

  // Next.js standard Basic Auth parsing
  const basicAuth = req.headers.get('authorization');
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // Decode base64 
    const decoded = atob(authValue);
    
    // Safely split into username and password
    const colonIndex = decoded.indexOf(':');
    const submittedUser = decoded.slice(0, colonIndex);
    const submittedPwd = decoded.slice(colonIndex + 1);

    // Chrome auto-fills can be weird. To be super safe, 
    // we will let you in if the password matches EITHER the username field OR the password field
    if (submittedPwd === password || submittedUser === password || submittedPwd === `"${password}"`) {
      return NextResponse.next();
    }
  }

  // If unauthorized, prompt the browser's native login popup
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure 4billionyearson Admin Area"',
    },
  });
}

// We only want this middleware to protect the admin pages and admin API
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
