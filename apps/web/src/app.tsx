import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';

const HomePage = lazy(() =>
  import('@/pages/home-page').then((module) => ({ default: module.HomePage })),
);
const LoginPage = lazy(() =>
  import('@/pages/login-page').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/register-page').then((module) => ({ default: module.RegisterPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/onboarding-page').then((module) => ({ default: module.OnboardingPage })),
);
const AdminPage = lazy(() =>
  import('@/pages/admin/admin-page').then((module) => ({ default: module.AdminPage })),
);
const CandidatePage = lazy(() =>
  import('@/pages/candidate/candidate-page').then((module) => ({ default: module.CandidatePage })),
);
const CompanyPage = lazy(() =>
  import('@/pages/company/company-page').then((module) => ({ default: module.CompanyPage })),
);
const OpportunitiesPage = lazy(() =>
  import('@/pages/opportunities-page').then((module) => ({ default: module.OpportunitiesPage })),
);
const OpportunityDetailPage = lazy(() =>
  import('@/pages/opportunity-detail-page').then((module) => ({
    default: module.OpportunityDetailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/account-action-pages').then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/account-action-pages').then((module) => ({ default: module.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/account-action-pages').then((module) => ({ default: module.VerifyEmailPage })),
);
const VerifyCertificatePage = lazy(() =>
  import('@/pages/experiences/verify-certificate-page').then((module) => ({
    default: module.VerifyCertificatePage,
  })),
);
const PublicPassportPage = lazy(() =>
  import('@/pages/talent/public-passport-page').then((module) => ({
    default: module.PublicPassportPage,
  })),
);
const ContributionValidationPage = lazy(() =>
  import('@/pages/talent/public-passport-page').then((module) => ({
    default: module.ContributionValidationPage,
  })),
);
const AboutPage = lazy(() =>
  import('@/pages/institutional-pages').then((module) => ({ default: module.AboutPage })),
);
const LegalNoticePage = lazy(() =>
  import('@/pages/institutional-pages').then((module) => ({ default: module.LegalNoticePage })),
);
const PrivacyPolicyPage = lazy(() =>
  import('@/pages/institutional-pages').then((module) => ({ default: module.PrivacyPolicyPage })),
);
const CookiePolicyPage = lazy(() =>
  import('@/pages/institutional-pages').then((module) => ({ default: module.CookiePolicyPage })),
);
const TermsPage = lazy(() =>
  import('@/pages/institutional-pages').then((module) => ({ default: module.TermsPage })),
);

export function App() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-50">
          <div
            className="border-t-primary h-10 w-10 animate-spin rounded-full border-4 border-slate-200"
            aria-label="Cargando"
          />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify/:certificateCode" element={<VerifyCertificatePage />} />
        <Route path="/verify" element={<VerifyCertificatePage />} />
        <Route path="/passport/:code" element={<PublicPassportPage />} />
        <Route path="/validate-contribution/:token" element={<ContributionValidationPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="/conocenos" element={<AboutPage />} />
        <Route path="/aviso-legal" element={<LegalNoticePage />} />
        <Route path="/politica-de-privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/politica-de-cookies" element={<CookiePolicyPage />} />
        <Route path="/terminos-y-condiciones" element={<TermsPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute roles={['CANDIDATE', 'COMPANY']}>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/*"
          element={
            <ProtectedRoute roles={['CANDIDATE']}>
              <CandidatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/*"
          element={
            <ProtectedRoute roles={['COMPANY']}>
              <CompanyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Suspense>
  );
}
