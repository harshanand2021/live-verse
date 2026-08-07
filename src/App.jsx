import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

import Login from './pages/Login';
import Signup from '../src/pages/SignUp';  // ← updated import path
import CreateRoom from './pages/CreateRoom';

const RoomList  = lazy(() => import('./pages/RoomList'));
const HostReady = lazy(() => import('./pages/HostReady'));
const WatchRoom = lazy(() => import('./pages/WatchRoom'));
const RoomStats = lazy(() => import('./pages/RoomStats'));   // ← lazy

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/rooms" element={<RoomList />} />
              <Route path="/host/new" element={<CreateRoom />} />
              <Route path="/host/:roomId" element={<HostReady />} />
              <Route path="/room/:roomId" element={<WatchRoom />} />
              <Route path="/rooms/:roomId/stats" element={<RoomStats />} />  {/* ← moved here */}
            </Route>

            <Route path="/" element={<Navigate to="/rooms" replace />} />
            <Route path="*" element={<Navigate to="/rooms" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}