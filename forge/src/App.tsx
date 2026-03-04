import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DailyBoardPage from './pages/DailyBoardPage';
import GoalsPage from './pages/GoalsPage';
import NewGoalPage from './pages/NewGoalPage';
import BlindBoxPage from './pages/BlindBoxPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DailyBoardPage />} />
          <Route path="/daily" element={<Navigate to="/" replace />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/goals/new" element={<NewGoalPage />} />
          <Route path="/blind-box" element={<BlindBoxPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
