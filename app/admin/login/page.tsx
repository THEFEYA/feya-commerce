import Link from 'next/link';
import { loginAdmin } from './actions';
import { isAdminAuthRequired } from '@/lib/supabaseAuth';

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

function getErrorMessage(error: string | undefined) {
  if (!error) return null;
  if (error === 'missing_credentials') return 'Enter email and password.';
  if (error === 'invalid_credentials') return 'Invalid email or password.';
  if (error === 'not_authorized') return 'This account is authenticated but is not approved for FEYA Admin.';
  return error;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);
  const authRequired = isAdminAuthRequired();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/" className="brand-mark">TheFEYA</Link>
          <div className="nav-links">
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner" style={{ maxWidth: '620px', margin: '40px auto' }}>
          <div className="phase-label">FEYA Admin authentication</div>
          <h1>Admin sign in</h1>
          <p>Existing Supabase Auth accounts only. Public signup is intentionally not available.</p>

          {!authRequired ? (
            <div className="notice">
              Admin auth scaffolding is installed but enforcement is currently disabled. Set FEYA_ADMIN_AUTH_REQUIRED=true only after an approved admin allowlist is configured.
            </div>
          ) : null}

          {errorMessage ? <div className="notice">{errorMessage}</div> : null}

          <form action={loginAdmin} className="grid" style={{ gap: '14px' }}>
            <label>
              <span className="muted">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                style={{ width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px' }}
              />
            </label>

            <label>
              <span className="muted">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={{ width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px' }}
              />
            </label>

            <button type="submit" style={{ padding: '12px 16px', borderRadius: '12px', cursor: 'pointer' }}>
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
