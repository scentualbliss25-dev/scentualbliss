import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export const metadata = {
  title: 'Admin — ScentualBliss',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <>
      <ServiceWorkerRegister />
      {children}
    </>
  );
}
