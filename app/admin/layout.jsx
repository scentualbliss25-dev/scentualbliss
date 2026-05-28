import { ServiceWorkerRegister } from './ServiceWorkerRegister';
import LogoutButton from './LogoutButton';

export const metadata = {
  title: 'Admin — ScentualBliss',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <>
      <ServiceWorkerRegister />
      <LogoutButton />
      {children}
    </>
  );
}
