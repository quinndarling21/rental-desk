import { Navigate, Route, Routes } from 'react-router';
import { AgreementDetail } from './features/agreements/AgreementDetail';
import { AgreementsList } from './features/agreements/AgreementsList';
import { BenchFindingForm } from './features/bench/BenchFinding';
import { CheckOut } from './features/checkout/CheckOut';
import { LinePhotos } from './features/photos/LinePhotos';
import { ShareView } from './features/photos/ShareView';
import { ReturnCheckIn } from './features/returns/ReturnCheckIn';
import { AppLayout } from './layout/AppLayout';
import { NotFound } from './layout/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="share/:token" element={<ShareView />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/agreements" replace />} />
        <Route path="agreements" element={<AgreementsList />} />
        <Route path="agreements/:raNumber" element={<AgreementDetail />} />
        <Route path="agreements/:raNumber/return" element={<ReturnCheckIn />} />
        <Route path="agreements/:raNumber/lines/:assetTag/bench" element={<BenchFindingForm />} />
        <Route path="agreements/:raNumber/lines/:assetTag" element={<LinePhotos />} />
        <Route path="checkout" element={<CheckOut />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
