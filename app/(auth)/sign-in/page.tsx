import Image from 'next/image';
import { APP_NAME, ORG_NAME } from '@/lib/site';
import { SignInForm } from './SignInForm';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 text-center">
          <Image
            src="/logo.png"
            alt={`Logo ${ORG_NAME}`}
            width={80}
            height={88}
            className="h-20 w-auto mx-auto mb-4"
            priority
          />
          <h1 className="text-2xl font-bold text-primary-700">{APP_NAME}</h1>
          <p className="text-slate-600 mt-2 text-sm">Sila log masuk untuk meneruskan</p>
        </div>
        <SignInForm />
        <p className="text-xs text-slate-500 text-center mt-6">
          Hanya emel yang didaftarkan oleh admin masjid boleh log masuk.
          Hubungi admin jika perlu akses.
        </p>
      </div>
    </div>
  );
}
