import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import OnboardingPage from '@/pages/OnboardingPage/OnboardingPage';
import CalendarPage from '@/pages/CalendarPage/CalendarPage';
import KnowledgePage from '@/pages/KnowledgePage/KnowledgePage';
import KnowledgeDetailPage from '@/pages/KnowledgePage/KnowledgeDetailPage';
import ProfilePage from '@/pages/ProfilePage/ProfilePage';
import AvatarPage from '@/pages/AvatarPage/AvatarPage';
import NicknamePage from '@/pages/NicknamePage/NicknamePage';
import ProfileEditPage from '@/pages/ProfileEditPage/ProfileEditPage';
import PeriodSettingsPage from '@/pages/PeriodSettingsPage/PeriodSettingsPage';
import RemindersPage from '@/pages/RemindersPage/RemindersPage';
import FeedbackPage from '@/pages/FeedbackPage/FeedbackPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/calendar" replace />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:category" element={<KnowledgeDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/edit" element={<ProfileEditPage />} />
        <Route path="profile/avatar" element={<AvatarPage />} />
        <Route path="profile/nickname" element={<NicknamePage />} />
        <Route path="profile/settings" element={<PeriodSettingsPage />} />
        <Route path="profile/reminders" element={<RemindersPage />} />
        <Route path="profile/feedback" element={<FeedbackPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
