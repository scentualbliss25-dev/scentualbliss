import LoginForm from './LoginForm';

export const metadata = {
  title: 'Acceso Admin',
  robots: { index: false, follow: false },
};

// Si ya hay sesión válida y el usuario vuelve a /admin/login, lo mandamos
// al panel. Pero no podemos verificar la sesión desde un Server Component
// fácilmente sin importar el middleware logic, así que dejamos que sea
// el cliente quien lo decida (el middleware NO bloquea /admin/login).
// Next 15: searchParams es ahora una Promise.
export default async function AdminLoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = sp?.next || '/admin';
  return <LoginForm next={next} />;
}
