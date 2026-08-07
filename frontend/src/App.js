import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Login from './pages/Login';
import Register from './pages/Register';
import PlayerRegister from './pages/PlayerRegister';
import PlayerProfile from './pages/PlayerProfile';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import AuctionRoom from './pages/AuctionRoom';
import LiveSpectator from './pages/LiveSpectator';
import OwnerMobile from './pages/OwnerMobile';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-player" element={<PlayerRegister />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
              <Route path="/dashboard/*" element={<ProtectedRoute roles={['coordinator']}><CoordinatorDashboard/></ProtectedRoute>} />
              <Route path="/auction/:id/room" element={<ProtectedRoute roles={['coordinator']}><AuctionRoom/></ProtectedRoute>} />
              <Route path="/auction/:id/live" element={<LiveSpectator/>} />
              <Route path="/owner/:auctionId" element={<ProtectedRoute><OwnerMobile/></ProtectedRoute>} />
              <Route path="/player/profile" element={<ProtectedRoute roles={['player']}><PlayerProfile/></ProtectedRoute>} />
            </Routes>
            <Toaster />
            <SonnerToaster theme="dark" richColors position="top-right"/>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
