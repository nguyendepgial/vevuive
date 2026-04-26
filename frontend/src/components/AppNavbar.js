import { Container, Nav, Navbar, Form, Button, Dropdown } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

function AppNavbar({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [keyword, setKeyword] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (setUser) {
      setUser(null);
    }

    navigate("/login");
  };

  const getInitial = () => {
    if (!user?.full_name) return "U";
    return user.full_name.trim().charAt(0).toUpperCase();
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const trimmedKeyword = keyword.trim();

    if (trimmedKeyword) {
      navigate(`/home?search=${encodeURIComponent(trimmedKeyword)}`);
    } else {
      navigate("/home");
    }
  };

  const isActive = (path) => {
    if (path === "/marketplace") {
      return location.pathname.startsWith("/marketplace");
    }

    if (path === "/admin") {
      return location.pathname.startsWith("/admin");
    }

    return location.pathname === path;
  };

  return (
    <>
      <Navbar expand="lg" className="tb-topbar">
        <Container fluid="xl" className="tb-topbar-inner">
          <Navbar.Brand as={Link} to={user ? "/home" : "/"} className="tb-logo">
            ConcertTicket
          </Navbar.Brand>

          <Form className="tb-search" onSubmit={handleSearch}>
            <div className="tb-search-box">
              <span className="tb-search-icon">🔍</span>

              <Form.Control
                type="text"
                placeholder="Bạn tìm gì hôm nay?"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="tb-search-input"
              />

              <Button type="submit" className="tb-search-btn">
                Tìm kiếm
              </Button>
            </div>
          </Form>

          <div className="tb-actions">
            {user ? (
              <>
                <Button
                  className="tb-create-btn"
                  onClick={() =>
                    navigate(user.role === "admin" ? "/admin/events" : "/marketplace")
                  }
                >
                  {user.role === "admin" ? "Tạo sự kiện" : "Sàn vé"}
                </Button>

                <Dropdown align="end">
                  <Dropdown.Toggle className="tb-user-toggle">
                    <span className="tb-user-avatar">{getInitial()}</span>
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="tb-dropdown">
                    <Dropdown.Header>
                      {user.full_name || "Người dùng"}
                    </Dropdown.Header>

                    <Dropdown.Item as={Link} to="/profile">
                      Hồ sơ
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/my-tickets">
                      Vé của tôi
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/wallet-topup">
                      Ví nội bộ
                    </Dropdown.Item>

                    <Dropdown.Item as={Link} to="/ticket-transfer">
                      Chuyển nhượng vé
                    </Dropdown.Item>

                    <Dropdown.Item as={Link} to="/incoming-transfers">
                      Yêu cầu nhận vé
                    </Dropdown.Item>

                    <Dropdown.Item as={Link} to="/marketplace">
                      Sàn chuyển nhượng
                    </Dropdown.Item>

                    <Dropdown.Item as={Link} to="/my-listings">
                      Vé tôi đăng bán
                    </Dropdown.Item>

                    <Dropdown.Item as={Link} to="/home">
                      Trang chủ
                    </Dropdown.Item>

                    {user.role === "admin" && (
                      <>
                        <Dropdown.Divider />

                        <Dropdown.Item as={Link} to="/admin">
                          Trang quản trị
                        </Dropdown.Item>

                        <Dropdown.Item as={Link} to="/admin/events">
                          Quản lý sự kiện
                        </Dropdown.Item>

                        <Dropdown.Item as={Link} to="/admin/marketplace">
                          Quản lý sàn chuyển nhượng
                        </Dropdown.Item>

                        <Dropdown.Item as={Link} to="/admin/topup-requests">
                          Duyệt nạp tiền
                        </Dropdown.Item>
                      </>
                    )}

                    <Dropdown.Divider />

                    <Dropdown.Item onClick={handleLogout} className="text-danger">
                      Đăng xuất
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </>
            ) : (
              <>
                <Button
                  variant="link"
                  className="tb-link-btn"
                  onClick={() => navigate("/login")}
                >
                  Đăng nhập
                </Button>

                <span className="tb-divider">|</span>

                <Button
                  variant="link"
                  className="tb-link-btn"
                  onClick={() => navigate("/register")}
                >
                  Đăng ký
                </Button>
              </>
            )}
          </div>
        </Container>
      </Navbar>

      <div className="tb-menubar">
        <Container fluid="xl">
          <Nav className="tb-menu-list">
            <Nav.Link
              as={Link}
              to="/home"
              className={isActive("/home") ? "active" : ""}
            >
              Nhạc sống
            </Nav.Link>

            <Nav.Link as={Link} to="/home">
              Sân khấu & Nghệ thuật
            </Nav.Link>

            <Nav.Link as={Link} to="/home">
              Thể thao
            </Nav.Link>

            <Nav.Link as={Link} to="/home">
              Workshop
            </Nav.Link>

            <Nav.Link as={Link} to="/home">
              Tham quan
            </Nav.Link>

            <Nav.Link as={Link} to="/home">
              Khác
            </Nav.Link>

            <Nav.Link
              as={Link}
              to="/marketplace"
              className={isActive("/marketplace") ? "active" : ""}
            >
              Sàn vé
            </Nav.Link>

            {user && (
              <>
                <Nav.Link
                  as={Link}
                  to="/profile"
                  className={isActive("/profile") ? "active" : ""}
                >
                  Hồ sơ
                </Nav.Link>

                <Nav.Link
                  as={Link}
                  to="/my-tickets"
                  className={isActive("/my-tickets") ? "active" : ""}
                >
                  Vé của tôi
                </Nav.Link>
                  
                <Nav.Link
                  as={Link}
                  to="/wallet-topup"
                  className={isActive("/wallet-topup") ? "active" : ""}
                >
                  Ví nội bộ
                </Nav.Link>

                <Nav.Link
                  as={Link}
                  to="/ticket-transfer"
                  className={isActive("/ticket-transfer") ? "active" : ""}
                >
                  Chuyển nhượng vé
                </Nav.Link>

                <Nav.Link
                  as={Link}
                  to="/incoming-transfers"
                  className={isActive("/incoming-transfers") ? "active" : ""}
                >
                  Yêu cầu nhận vé
                </Nav.Link>

                <Nav.Link
                  as={Link}
                  to="/my-listings"
                  className={isActive("/my-listings") ? "active" : ""}
                >
                  Vé tôi đăng bán
                </Nav.Link>

                {user.role === "admin" && (
                  <>
                    <Nav.Link
                      as={Link}
                      to="/admin"
                      className={isActive("/admin") ? "active" : ""}
                    >
                      Quản trị
                    </Nav.Link>

                    <Nav.Link
                      as={Link}
                      to="/admin/topup-requests"
                      className={isActive("/admin/topup-requests") ? "active" : ""}
                    >
                      Duyệt nạp tiền
                    </Nav.Link>
                  </>
                )}
              </>
            )}
          </Nav>
        </Container>
      </div>
    </>
  );
}

export default AppNavbar;