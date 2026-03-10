import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingState } from './components/ui/LoadingState';
import { useAuth } from './contexts/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { LoginPage } from './pages/LoginPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { MembershipPage } from './pages/MembershipPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProgramDetailPage } from './pages/ProgramDetailPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { VolunteerPage } from './pages/VolunteerPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProgramsPage } from './pages/admin/AdminProgramsPage';
import { AdminChaptersPage } from './pages/admin/AdminChaptersPage';
import { AdminVolunteerOpportunitiesPage } from './pages/admin/AdminVolunteerOpportunitiesPage';
import { AdminContactPage } from './pages/admin/AdminContactPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVolunteerSignupsPage } from './pages/admin/AdminVolunteerSignupsPage';

const App = () => {
  const location = useLocation();
  const { loading, profile } = useAuth();
  const state = location.state as { backgroundLocation?: Location } | null;

  return (
    <>
      <Routes location={state?.backgroundLocation ?? location}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:slug" element={<ProgramDetailPage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/volunteer" element={<VolunteerPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'chapter_head']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              loading ? (
                <LoadingState label="Loading dashboard..." />
              ) : profile?.role === 'chapter_head' ? (
                <Navigate to="/admin/volunteer-opportunities" replace />
              ) : (
                <AdminDashboardPage />
              )
            }
          />
          <Route
            path="programs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProgramsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="chapters"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminChaptersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="volunteer-opportunities" element={<AdminVolunteerOpportunitiesPage />} />
          <Route path="volunteer-signups" element={<AdminVolunteerSignupsPage />} />
          <Route
            path="contact"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminContactPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {state?.backgroundLocation ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      ) : null}
    </>
  );
};

export default App;
