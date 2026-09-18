import Link from 'next/link';
import { loginAdmin } from './actions';
import { isAdminAuthRequired } from '@/lib/supabaseAuth';

type PageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

function getErrorMessage(error: string | undefined) {
  if (!error) return null;
  if (error === 'missing_credentials') return 'Введите email и пароль.';
  if (error === 'invalid_credentials') return 'Неверный email или пароль.';
  if (error === 'not_authorized') return 'Аккаунт подтверждён, но не имеет доступа к FEYA Admin.';
  return error;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);
  const authRequired = isAdminAuthRequired();
  const nextPath = typeof params.next === 'string' && params.next.startsWith('/admin') ? params.next : '/admin';

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
          <div className="phase-label">Защищённый вход FEYA Admin</div>
          <h1>Вход в админку</h1>
          <p>Только для заранее созданных аккаунтов Supabase Auth. Публичная регистрация намеренно отключена.</p>

          {!authRequired ? (
            <div className="notice">
              Механизм защищённого входа установлен, но обязательная авторизация пока выключена. Включать её можно только после настройки разрешённого списка владельцев.
            </div>
          ) : null}

          {errorMessage ? <div className="notice">{errorMessage}</div> : null}

          <form action={loginAdmin} className="grid" style={{ gap: '14px' }}>
            <input type="hidden" name="next" value={nextPath} />
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
              <span className="muted">Пароль</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={{ width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px' }}
              />
            </label>

            <button type="submit" style={{ padding: '12px 16px', borderRadius: '12px', cursor: 'pointer' }}>
              Войти
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
