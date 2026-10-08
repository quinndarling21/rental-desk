import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { NotFound } from './layout/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/agreements" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
