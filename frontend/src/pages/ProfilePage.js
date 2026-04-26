import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Badge,
  Spinner,
  Table,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { updateProfile } from "../services/userService";
import { getMyOrders } from "../services/orderService";
import {
  getMyWallet,
  linkWallet,
  updateMyWallet,
  deleteMyWallet,
} from "../services/walletService";

function ProfilePage({ setUser }) {
  const navigate = useNavigate();

  const getStoredUser = () => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser || rawUser === "undefined") return null;
      return JSON.parse(rawUser);
    } catch (error) {
      localStorage.removeItem("user");
      return null;
    }
  };

  const storedUser = useMemo(() => getStoredUser(), []);
  const [profile, setProfile] = useState(storedUser);
  const [formData, setFormData] = useState({
    full_name: storedUser?.full_name || "",
    phone: storedUser?.phone || "",
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [ordersError, setOrdersError] = useState("");

  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [walletError, setWalletError] = useState("");
  const [walletForm, setWalletForm] = useState({
    wallet_address: "",
    wallet_type: "metamask",
    network_name: "sepolia",
  });

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");

  const loadWallet = async () => {
    try {
      setWalletLoading(true);
      setWalletError("");
      setWalletMessage("");

      const response = await getMyWallet();

      if (response.data?.success && response.data?.data) {
        const walletData = response.data.data;
        setWallet(walletData);
        setWalletForm({
          wallet_address: walletData.wallet_address || "",
          wallet_type: walletData.wallet_type || "metamask",
          network_name: walletData.network_name || "sepolia",
        });
      } else {
        setWallet(null);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setWallet(null);
        setWalletForm({
          wallet_address: "",
          wallet_type: "metamask",
          network_name: "sepolia",
        });
      } else {
        setWalletError(error.response?.data?.message || "Lỗi khi tải thông tin ví");
      }
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      setOrdersError("");

      const response = await getMyOrders({ limit: 50 });

      if (response.data?.success) {
        setOrders(response.data.data || []);
      } else {
        setOrdersError("Không lấy được lịch sử mua vé");
      }
    } catch (error) {
      setOrdersError(error.response?.data?.message || "Lỗi khi tải lịch sử mua vé");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchMyTickets = async () => {
    try {
      setLoadingTickets(true);
      setTicketsError("");

      const response = await api.get("/users/tickets", {
        params: { limit: 100 },
      });

      if (response.data?.success) {
        setTickets(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setTickets([]);
        setTicketsError("Không lấy được danh sách vé của bạn");
      }
    } catch (error) {
      setTickets([]);
      setTicketsError(
        error.response?.data?.message ||
          "Không thể tải danh sách vé. Nếu backend dùng route khác, hãy đổi lại endpoint /users/tickets."
      );
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMyTickets();
    loadWallet();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleWalletChange = (e) => {
    setWalletForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const response = await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
      });

      if (response.data?.success) {
        const updatedUser = {
          ...profile,
          ...response.data.data,
        };

        setProfile(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        if (setUser) {
          setUser(updatedUser);
        }

        setProfileMessage("Cập nhật hồ sơ thành công");
      } else {
        setProfileError(response.data?.message || "Cập nhật thất bại");
      }
    } catch (error) {
      setProfileError(error.response?.data?.message || "Lỗi khi cập nhật hồ sơ");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    setWalletSaving(true);
    setWalletError("");
    setWalletMessage("");

    try {
      const payload = {
        wallet_address: walletForm.wallet_address.trim(),
        wallet_type: walletForm.wallet_type,
        network_name: walletForm.network_name.trim(),
      };

      const response = wallet
        ? await updateMyWallet(payload)
        : await linkWallet(payload);

      if (response.data?.success) {
        setWalletMessage(wallet ? "Cập nhật ví thành công" : "Liên kết ví thành công");
        await loadWallet();
      } else {
        setWalletError(response.data?.message || "Không thể lưu thông tin ví");
      }
    } catch (error) {
      setWalletError(error.response?.data?.message || "Lỗi khi lưu thông tin ví");
    } finally {
      setWalletSaving(false);
    }
  };

  const handleDeleteWallet = async () => {
    const ok = window.confirm("Bạn có chắc muốn gỡ liên kết ví không?");
    if (!ok) return;

    try {
      setWalletSaving(true);
      setWalletError("");
      setWalletMessage("");

      const response = await deleteMyWallet();

      if (response.data?.success) {
        setWalletMessage("Gỡ liên kết ví thành công");
        setWallet(null);
        setWalletForm({
          wallet_address: "",
          wallet_type: "metamask",
          network_name: "sepolia",
        });
      } else {
        setWalletError(response.data?.message || "Không thể gỡ ví");
      }
    } catch (error) {
      setWalletError(error.response?.data?.message || "Lỗi khi gỡ liên kết ví");
    } finally {
      setWalletSaving(false);
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "failed":
        return "danger";
      case "expired":
        return "dark";
      case "refunded":
        return "secondary";
      default:
        return "warning";
    }
  };

  const getOrderBadge = (status) => {
    switch (status) {
      case "awaiting_payment":
        return "warning";
      case "processing":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "secondary";
      case "expired":
        return "dark";
      default:
        return "warning";
    }
  };

  const renderPaymentText = (status) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "paid":
        return "Đã thanh toán";
      case "failed":
        return "Thất bại";
      case "expired":
        return "Hết hạn";
      case "refunded":
        return "Hoàn tiền";
      default:
        return status || "Không xác định";
    }
  };

  const renderOrderText = (status) => {
    switch (status) {
      case "awaiting_payment":
        return "Chờ thanh toán";
      case "processing":
        return "Đang xử lý";
      case "completed":
        return "Hoàn tất";
      case "cancelled":
        return "Đã hủy";
      case "expired":
        return "Hết hạn";
      default:
        return status || "Không xác định";
    }
  };

  const totalSpent = orders
    .filter((item) => item.payment_status === "paid")
    .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  const canTransferTicket = (ticket) => {
    return (
      ticket.ticket_status === "active" &&
      ticket.mint_status === "minted" &&
      Number(ticket.transferred_count || 0) < 1
    );
  };

  const handleGoToTransfer = (ticket) => {
    navigate("/ticket-transfer", {
      state: {
        selectedTicket: ticket,
      },
    });
  };

  return (
    <Container className="user-shell">
      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="hero-card">
            <Card.Body className="p-4 p-lg-5">
              <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="profile-avatar">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="hero-title mb-2" style={{ fontSize: "2rem" }}>
                      Hồ sơ người dùng
                    </div>
                    <div className="hero-text">
                      Quản lý thông tin cá nhân, liên kết ví và theo dõi lịch sử mua vé.
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-3 flex-wrap">
                  <div className="hero-chip">👤 {profile?.full_name || "Người dùng"}</div>
                  <div className="hero-chip">📧 {profile?.email || "Chưa có email"}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <div className="profile-stat">
            <div className="profile-stat-label">Tổng số đơn hàng</div>
            <div className="profile-stat-value">{orders.length}</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="profile-stat">
            <div className="profile-stat-label">Đơn đã thanh toán</div>
            <div className="profile-stat-value">
              {orders.filter((item) => item.payment_status === "paid").length}
            </div>
          </div>
        </Col>
        <Col md={4}>
          <div className="profile-stat">
            <div className="profile-stat-label">Tổng chi tiêu</div>
            <div className="profile-stat-value">
              {totalSpent.toLocaleString("vi-VN")} VND
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <Card className="profile-card h-100">
            <Card.Body className="p-4">
              <div className="section-title mb-3" style={{ fontSize: "1.6rem" }}>
                Thông tin cá nhân
              </div>

              {profileError && <Alert variant="danger">{profileError}</Alert>}
              {profileMessage && <Alert variant="success">{profileMessage}</Alert>}

              <div className="mb-4 text-muted">
                Cập nhật họ tên và số điện thoại để đồng bộ hồ sơ người dùng.
              </div>

              <Form onSubmit={handleUpdateProfile}>
                <Form.Group className="mb-3">
                  <Form.Label>Họ và tên</Form.Label>
                  <Form.Control
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Số điện thoại</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="text" value={profile?.email || ""} disabled />
                </Form.Group>

                <Button
                  type="submit"
                  className="soft-button soft-button-primary w-100"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="profile-card h-100">
            <Card.Body className="p-4">
              <div className="section-title mb-2" style={{ fontSize: "1.6rem" }}>
                Liên kết ví
              </div>
              <div className="section-subtitle mb-4">
                Tài khoản mới tạo có thể đăng nhập rồi liên kết ví ngay tại đây.
              </div>

              {walletError && <Alert variant="danger">{walletError}</Alert>}
              {walletMessage && <Alert variant="success">{walletMessage}</Alert>}

              {walletLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <>
                  {wallet ? (
                    <Alert variant="success">
                      Đã liên kết ví: <strong>{wallet.wallet_address}</strong>
                      <br />
                      Loại ví: <strong>{wallet.wallet_type}</strong> | Mạng: <strong>{wallet.network_name}</strong>
                    </Alert>
                  ) : (
                    <Alert variant="warning">
                      Bạn chưa liên kết ví nào. Muốn mua vé theo đúng backend hiện tại thì nên liên kết ví trước.
                    </Alert>
                  )}

                  <Form onSubmit={handleSaveWallet}>
                    <Row className="g-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Địa chỉ ví</Form.Label>
                          <Form.Control
                            type="text"
                            name="wallet_address"
                            value={walletForm.wallet_address}
                            onChange={handleWalletChange}
                            placeholder="Nhập địa chỉ ví dạng 0x..."
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Loại ví</Form.Label>
                          <Form.Select
                            name="wallet_type"
                            value={walletForm.wallet_type}
                            onChange={handleWalletChange}
                          >
                            <option value="metamask">Metamask</option>
                            <option value="walletconnect">WalletConnect</option>
                            <option value="other">Other</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Mạng</Form.Label>
                          <Form.Control
                            type="text"
                            name="network_name"
                            value={walletForm.network_name}
                            onChange={handleWalletChange}
                            placeholder="Ví dụ: sepolia"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-flex gap-3 flex-wrap mt-4">
                      <Button
                        type="submit"
                        className="soft-button soft-button-primary"
                        disabled={walletSaving}
                      >
                        {walletSaving
                          ? "Đang lưu..."
                          : wallet
                          ? "Cập nhật ví"
                          : "Liên kết ví"}
                      </Button>

                      {wallet && (
                        <Button
                          type="button"
                          className="soft-button soft-button-outline"
                          onClick={handleDeleteWallet}
                          disabled={walletSaving}
                        >
                          Gỡ liên kết ví
                        </Button>
                      )}
                    </div>
                  </Form>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="profile-card">
            <Card.Body className="p-4">
              <div className="section-title mb-2" style={{ fontSize: "1.6rem" }}>
                Vé của tôi
              </div>
              <div className="section-subtitle mb-4">
                Bấm chuyển nhượng trực tiếp trên từng vé để chuyển sang trang tạo yêu cầu.
              </div>

              {ticketsError && <Alert variant="danger">{ticketsError}</Alert>}

              {loadingTickets ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-5 text-muted">Bạn chưa có vé nào.</div>
              ) : (
                <Row className="g-4">
                  {tickets.map((ticket) => (
                    <Col lg={6} key={ticket.id}>
                      <Card className="h-100 border rounded-4 shadow-sm">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                            <div>
                              <div className="fw-bold fs-5">
                                {ticket.event_title || ticket.ticket_type_name_snapshot || "Vé sự kiện"}
                              </div>
                              <div className="text-muted">Mã vé: {ticket.ticket_code}</div>
                            </div>

                            <Badge bg={canTransferTicket(ticket) ? "success" : "secondary"}>
                              {canTransferTicket(ticket) ? "Có thể chuyển" : "Không thể chuyển"}
                            </Badge>
                          </div>

                          <div className="mb-2">
                            <strong>Giá vé:</strong>{" "}
                            {Number(ticket.unit_price || 0).toLocaleString("vi-VN")} VND
                          </div>

                          <div className="mb-2">
                            <strong>Trạng thái vé:</strong> {ticket.ticket_status || "—"}
                          </div>

                          <div className="mb-2">
                            <strong>Mint NFT:</strong> {ticket.mint_status || "—"}
                          </div>

                          <div className="mb-3">
                            <strong>Số lần đã chuyển:</strong> {ticket.transferred_count || 0}
                          </div>

                          <div className="d-flex gap-2 flex-wrap">
                            <Button
                              className="soft-button soft-button-primary"
                              onClick={() => handleGoToTransfer(ticket)}
                              disabled={!canTransferTicket(ticket)}
                            >
                              Chuyển nhượng
                            </Button>

                            {!canTransferTicket(ticket) && (
                              <Button
                                className="soft-button soft-button-outline"
                                disabled
                              >
                                Chưa đủ điều kiện
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="profile-card">
            <Card.Body className="p-4">
              <div className="section-title mb-2" style={{ fontSize: "1.6rem" }}>
                Lịch sử mua vé
              </div>
              <div className="section-subtitle mb-4">
                Trạng thái đơn và thanh toán đã được đổi để khớp backend hiện tại.
              </div>

              {ordersError && <Alert variant="danger">{ordersError}</Alert>}

              {loadingOrders ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-5 text-muted">Bạn chưa có đơn hàng nào.</div>
              ) : (
                <Table responsive hover className="table-modern align-middle">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Tổng tiền</th>
                      <th>Thanh toán</th>
                      <th>Đơn hàng</th>
                      <th>Số vé</th>
                      <th>Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="fw-bold">{order.order_code}</td>
                        <td>{Number(order.total_amount).toLocaleString("vi-VN")} VND</td>
                        <td>
                          <Badge bg={getPaymentBadge(order.payment_status)} className="status-badge">
                            {renderPaymentText(order.payment_status)}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getOrderBadge(order.order_status)} className="status-badge">
                            {renderOrderText(order.order_status)}
                          </Badge>
                        </td>
                        <td>{order.total_quantity || 0}</td>
                        <td>{new Date(order.created_at).toLocaleDateString("vi-VN")}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            className="soft-button soft-button-outline"
                            onClick={() => navigate(`/payment/${order.id}`)}
                          >
                            {order.payment_status === "pending" && order.order_status === "awaiting_payment"
                              ? "Thanh toán ngay"
                              : "Xem đơn"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ProfilePage;