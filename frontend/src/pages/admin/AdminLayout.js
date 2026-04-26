import { useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Receipt } from "react-bootstrap-icons";
import {
  BarChartLineFill,
  CalendarEvent,
  TicketPerforatedFill,
  Shop,
  Wallet2,
  HouseDoorFill,
  BoxArrowRight,
  List,
  X,
  QrCodeScan,
  PeopleFill,
  ShieldLockFill,
} from "react-bootstrap-icons";

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

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = useMemo(() => getStoredUser(), []);

  const adminName = user?.full_name || "Admin VeVuiVe";
  const adminEmail = user?.email || "admin@vevuive.local";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const getPageTitle = () => {
    if (location.pathname === "/admin") return "Dashboard";
    if (location.pathname.includes("/admin/events")) return "Quản lý sự kiện";
    if (location.pathname.includes("/admin/ticket-types")) return "Quản lý loại vé";
    if (location.pathname.includes("/admin/marketplace")) return "Quản lý sàn chuyển nhượng";
    if (location.pathname.includes("/admin/topup-requests")) return "Duyệt yêu cầu nạp tiền";
    return "Trang quản trị";
  };

  const mainMenus = [
    {
      label: "Dashboard",
      path: "/admin",
      icon: <BarChartLineFill />,
      exact: true,
    },
    {
      label: "Quản lý sự kiện",
      path: "/admin/events",
      icon: <CalendarEvent />,
    },
    {
      label: "Quản lý loại vé",
      path: "/admin/ticket-types",
      icon: <TicketPerforatedFill />,
    },
        {
      label: "Quản lý vé",
      path: "/admin/tickets",
      icon: <TicketPerforatedFill />,
    },
    {
      label: "Quản lý đơn hàng",
      path: "/admin/orders",
      icon: <Receipt />,
    },
    {
      label: "Quản lý người dùng",
      path: "/admin/users",
      icon: <PeopleFill />,
    },
    {
      label: "Sàn chuyển nhượng",
      path: "/admin/marketplace",
      icon: <Shop />,
    },
    {
      label: "Duyệt nạp tiền",
      path: "/admin/topup-requests",
      icon: <Wallet2 />,
    },
    {
      label: "Check-in vé",
      path: "/admin/checkin",
      icon: <QrCodeScan />,
    },
  ];

  const futureMenus = [
  
  

    "Check-in",
  ];

  return (
    <div className="admin-modern-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-mobile-backdrop"
          onClick={closeSidebar}
          aria-label="Đóng menu"
        />
      )}

      <aside
        className={`admin-modern-sidebar ${sidebarOpen ? "show" : ""}`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-brand-mark">VV</div>

          <div>
            <div className="admin-brand-title">VeVuiVe Admin</div>
            <div className="admin-brand-subtitle">Quản trị hệ thống vé</div>
          </div>

          <button
            type="button"
            className="admin-sidebar-close"
            onClick={closeSidebar}
            aria-label="Đóng sidebar"
          >
            <X />
          </button>
        </div>

        <div className="admin-sidebar-user">
          <div className="admin-user-avatar">
            {adminName.trim().charAt(0).toUpperCase()}
          </div>

          <div className="admin-user-meta">
            <div className="admin-user-name">{adminName}</div>
            <div className="admin-user-email">{adminEmail}</div>
          </div>
        </div>

        <div className="admin-sidebar-section-label">Điều hướng chính</div>

        <nav className="admin-sidebar-nav">
          {mainMenus.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              end={menu.exact}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-sidebar-icon">{menu.icon}</span>
              <span>{menu.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-section-label">Chức năng mở rộng</div>

        <div className="admin-sidebar-nav">
          {futureMenus.map((label) => (
            <div key={label} className="admin-sidebar-link disabled">
              <span className="admin-sidebar-icon">
                <ShieldLockFill />
              </span>
              <span>{label}</span>
              <span className="admin-soon-badge">sau</span>
            </div>
          ))}
        </div>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-action"
            onClick={() => navigate("/home")}
          >
            <HouseDoorFill />
            <span>Về trang user</span>
          </button>

          <button
            type="button"
            className="admin-sidebar-action danger"
            onClick={handleLogout}
          >
            <BoxArrowRight />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <section className="admin-modern-main">
        <header className="admin-modern-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <List />
            </button>

            <div>
              <div className="admin-breadcrumb">Admin / {getPageTitle()}</div>
              <h1>{getPageTitle()}</h1>
            </div>
          </div>

          <div className="admin-topbar-right">
            <button
              type="button"
              className="admin-topbar-button"
              onClick={() => navigate("/home")}
            >
              Về trang user
            </button>

            <div className="admin-topbar-profile">
              <div className="admin-topbar-avatar">
                {adminName.trim().charAt(0).toUpperCase()}
              </div>

              <div className="admin-topbar-profile-text">
                <div>{adminName}</div>
                <span>Administrator</span>
              </div>
            </div>

            <button
              type="button"
              className="admin-topbar-logout"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="admin-modern-content">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

export default AdminLayout;