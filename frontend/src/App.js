import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useState } from "react";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentPage from "./pages/PaymentPage";
import LandingPage from "./pages/LandingPage";

import AppNavbar from "./components/AppNavbar";
import Footer from "./components/Footer";

import TicketTransferPage from "./pages/TicketTransferPage";
import MyIncomingTransfersPage from "./pages/MyIncomingTransfersPage";
import MarketplacePage from "./pages/MarketplacePage";
import MyListingsPage from "./pages/MyListingsPage";
import WalletTopupPage from "./pages/WalletTopupPage";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminEventPage from "./pages/admin/AdminEventPage";
import AdminTicketTypePage from "./pages/admin/AdminTicketTypePage";
import AdminMarketplacePage from "./pages/admin/AdminMarketplacePage";
import AdminTopupRequestPage from "./pages/admin/AdminTopupRequestPage";
import AdminOrderManagePage from "./pages/admin/AdminOrderManagePage";
import AdminTicketManagePage from "./pages/admin/AdminTicketManagePage";
import AdminUserManagePage from "./pages/admin/AdminUserManagePage";
import MyTicketsPage from "./pages/MyTicketsPage";
import AdminCheckinPage from "./pages/admin/AdminCheckinPage";
import "./styles/user-ui.css";

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser || rawUser === "undefined") return null;
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem("user");
    return null;
  }
}

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState(getStoredUser());

  const isAdmin = user?.role === "admin";
  const isAdminPath = location.pathname.startsWith("/admin");

  return (
    <div
      style={{
        fontFamily: "Inter",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!isAdminPath && <AppNavbar user={user} setUser={setUser} />}

      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public / user routes */}
          <Route path="/" element={user ? <HomePage /> : <LandingPage />} />

          <Route
            path="/home"
            element={user ? <HomePage /> : <Navigate to="/login" />}
          />

          <Route path="/event/:eventId" element={<EventDetailPage />} />

          <Route path="/marketplace" element={<MarketplacePage />} />

          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage setUser={setUser} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/payment/:orderId"
            element={user ? <PaymentPage /> : <Navigate to="/login" />}
          />

          <Route
            path="/ticket-transfer"
            element={user ? <TicketTransferPage /> : <Navigate to="/login" />}
          />

          <Route
            path="/incoming-transfers"
            element={
              user ? <MyIncomingTransfersPage /> : <Navigate to="/login" />
            }
          />

          <Route
            path="/my-listings"
            element={user ? <MyListingsPage /> : <Navigate to="/login" />}
          />

          <Route
            path="/login"
            element={
              !user ? <LoginPage setUser={setUser} /> : <Navigate to="/home" />
            }
          />
            <Route
              path="/wallet-topup"
              element={user ? <WalletTopupPage /> : <Navigate to="/login" />}
            />
          <Route
            path="/register"
            element={
              !user ? <RegisterPage /> : <Navigate to="/home" />
            }
          />
          <Route
  path="/my-tickets"
  element={user ? <MyTicketsPage /> : <Navigate to="/login" />}
/>
          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              user && isAdmin ? <AdminLayout /> : <Navigate to="/login" />
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="events" element={<AdminEventPage />} />
            <Route path="ticket-types" element={<AdminTicketTypePage />} />
            <Route path="marketplace" element={<AdminMarketplacePage />} />
            <Route path="topup-requests" element={<AdminTopupRequestPage />} />
            <Route path="orders" element={<AdminOrderManagePage />} />
            <Route path="tickets" element={<AdminTicketManagePage />} />
            <Route path="users" element={<AdminUserManagePage />} />
            <Route path="checkin" element={<AdminCheckinPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {!isAdminPath && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;