import { Navigate, Route, Routes } from 'react-router';
import { AgreementDetail } from './features/agreements/AgreementDetail';
import { AgreementsList } from './features/agreements/AgreementsList';
import { AppLayout } from './layout/AppLayout';
import { NotFound } from './layout/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/agreements" replace />} />
        <Route path="agreements" element={<AgreementsList />} />
        <Route path="agreements/:raNumber" element={<AgreementDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
