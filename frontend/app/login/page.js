export const metadata = {
  title: 'تسجيل الدخول | XTOX',
  description: 'سجّل دخولك إلى حسابك في XTOX لبيع وشراء الإعلانات',
};

// Server component — imports client-side login via DynamicLogin wrapper
// DynamicLogin uses ssr:false which requires a client component context
import DynamicLogin from './DynamicLogin';

export default function LoginPage() {
  return <DynamicLogin />;
}
