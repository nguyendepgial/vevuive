import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  Row,
  Col,
  Modal,
  Tabs,
  Tab,
} from "react-bootstrap";

import {
  adminGetUsers,
  adminGetUserDetail,
  adminUpdateUserStatus,
} from "../../services/adminUserManageService";

function AdminUserManagePage() {
  const [users, setUsers] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const shortenText = (value, start = 10, end = 8) => {
    if (!value) return "Chưa liên kết";
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  };

  const getStatusBadge = (value) => {
    switch (value) {
      case "active":
      case "approved":
      case "paid":
      case "completed":
      case "success":
        return "success";

      case "inactive":
      case "cancelled":
      case "rejected":
      case "failed":
      case "expired":
        return "danger";

      case "pending":
      case "paid_submitted":
      case "awaiting_payment":
      case "transfer_pending":
        return "warning";

      case "admin":
        return "primary";

      case "customer":
        return "secondary";

      default:
        return "secondary";
    }
  };

  const renderStatus = (value) => {
    const map = {
      active: "Hoạt động",
      inactive: "Đã khóa",
      admin: "Admin",
      customer: "Khách hàng",

      pending: "Chờ xử lý",
      paid_submitted: "Đã báo thanh toán",
      approved: "Đã duyệt",
      rejected: "Bị từ chối",
      cancelled: "Đã hủy",

      paid: "Đã thanh toán",
      completed: "Hoàn tất",
      awaiting_payment: "Chờ thanh toán",
      expired: "Hết hạn",

      success: "Thành công",
      failed: "Thất bại",

      transfer_pending: "Đang khóa chuyển nhượng",
      used: "Đã dùng",
      minted: "Đã mint",
    };

    return map[value] || value || "Không xác định";
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: 1,
        limit: 30,
      };

      if (search.trim()) params.search = search.trim();
      if (role) params.role = role;
      if (status) params.status = status;

      const response = await adminGetUsers(params);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được danh sách người dùng");
        return;
      }

      setUsers(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [role, status]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadUsers();
  };

  const openDetail = async (userId) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedDetail(null);
      setShowDetailModal(true);

      const response = await adminGetUserDetail(userId);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được chi tiết người dùng");
        return;
      }

      setSelectedDetail(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi lấy chi tiết người dùng");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    const ok = window.confirm(
      nextStatus === "inactive"
        ? `Bạn có chắc muốn khóa tài khoản ${user.full_name}?`
        : `Bạn có chắc muốn mở lại tài khoản ${user.full_name}?`
    );

    if (!ok) return;

    try {
      setUpdatingId(user.id);
      setError("");
      setSuccess("");

      const response = await adminUpdateUserStatus({
        userId: user.id,
        status: nextStatus,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể cập nhật trạng thái người dùng");
        return;
      }

      setSuccess(
        nextStatus === "inactive"
          ? "Đã khóa tài khoản người dùng."
          : "Đã mở lại tài khoản người dùng."
      );

      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật trạng thái người dùng");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <Container fluid className="admin-dashboard-page">
        <div className="admin-hero-panel admin-compact-hero">
          <div>
            <div className="admin-hero-eyebrow">Quản lý hệ thống</div>
            <h2>Quản lý người dùng</h2>
            <p>
              Theo dõi tài khoản, ví liên kết, số dư ví nội bộ, vé đang sở hữu,
              đơn hàng và lịch sử nạp tiền của từng user.
            </p>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="admin-glass-card mb-4">
          <Card.Body className="p-4">
            <Form onSubmit={handleSearchSubmit}>
              <Row className="g-3">
                <Col lg={6}>
                  <Form.Label>Tìm kiếm</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tên, email, số điện thoại hoặc địa chỉ ví..."
                  />
                </Col>

                <Col lg={2}>
                  <Form.Label>Vai trò</Form.Label>
                  <Form.Select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="customer">Khách hàng</option>
                    <option value="admin">Admin</option>
                  </Form.Select>
                </Col>

                <Col lg={3}>
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Đã khóa</option>
                  </Form.Select>
                </Col>

                <Col lg={1} className="d-flex align-items-end">
                  <Button type="submit" className="soft-button soft-button-primary w-100">
                    Lọc
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="admin-glass-card">
          <Card.Body className="p-4">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : users.length === 0 ? (
              <Alert variant="info" className="mb-0">
                Không có người dùng nào phù hợp.
              </Alert>
            ) : (
              <Table responsive hover className="table-modern admin-modern-table align-middle">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Ví blockchain</th>
                    <th>Số dư nội bộ</th>
                    <th>Vé sở hữu</th>
                    <th>Đơn hàng</th>
                    <th>Sàn vé</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.full_name}</div>
                        <div className="text-muted small">{item.email}</div>
                        <div className="text-muted small">{item.phone || "Không có SĐT"}</div>
                      </td>

                      <td>
                        <Badge bg={getStatusBadge(item.role)}>
                          {renderStatus(item.role)}
                        </Badge>
                      </td>

                      <td>
                        <div className="fw-semibold">
                          {shortenText(item.wallet_address, 8, 8)}
                        </div>
                        {item.wallet_address && (
                          <div className="text-muted small">
                            {item.network_name || "Không rõ mạng"}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="fw-bold text-success">
                          {formatMoney(item.balance)}
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold">{item.owned_ticket_count} vé</div>
                        <div className="text-muted small">
                          {item.active_ticket_count} active
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold">{item.order_count} đơn</div>
                        <div className="text-muted small">
                          {formatMoney(item.total_paid_amount)}
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold">{item.listing_count} listing</div>
                        <div className="text-muted small">
                          {item.sold_listing_count} đã bán
                        </div>
                      </td>

                      <td>
                        <Badge bg={getStatusBadge(item.status)}>
                          {renderStatus(item.status)}
                        </Badge>
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openDetail(item.id)}
                          >
                            Chi tiết
                          </Button>

                          {item.role !== "admin" && (
                            <Button
                              size="sm"
                              variant={item.status === "active" ? "outline-danger" : "outline-success"}
                              onClick={() => handleToggleStatus(item)}
                              disabled={updatingId === item.id}
                            >
                              {updatingId === item.id
                                ? "Đang xử lý..."
                                : item.status === "active"
                                  ? "Khóa"
                                  : "Mở"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết người dùng</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : selectedDetail ? (
            <>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <div className="payment-summary-box h-100">
                    <div className="fw-bold mb-2">Thông tin tài khoản</div>
                    <div>{selectedDetail.user.full_name}</div>
                    <div>{selectedDetail.user.email}</div>
                    <div>{selectedDetail.user.phone || "Không có SĐT"}</div>
                    <div className="mt-2">
                      Vai trò:{" "}
                      <Badge bg={getStatusBadge(selectedDetail.user.role)}>
                        {renderStatus(selectedDetail.user.role)}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      Trạng thái:{" "}
                      <Badge bg={getStatusBadge(selectedDetail.user.status)}>
                        {renderStatus(selectedDetail.user.status)}
                      </Badge>
                    </div>
                    <div className="text-muted small mt-2">
                      Tạo lúc: {formatDateTime(selectedDetail.user.created_at)}
                    </div>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="payment-summary-box h-100">
                    <div className="fw-bold mb-2">Ví blockchain</div>
                    <div className="text-break">
                      {selectedDetail.user.wallet_address || "Chưa liên kết ví"}
                    </div>
                    <div className="text-muted small mt-2">
                      Loại ví: {selectedDetail.user.wallet_type || "Không có"}
                    </div>
                    <div className="text-muted small">
                      Network: {selectedDetail.user.network_name || "Không có"}
                    </div>
                    <div className="text-muted small">
                      Liên kết lúc: {formatDateTime(selectedDetail.user.linked_at)}
                    </div>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="payment-summary-box h-100">
                    <div className="fw-bold mb-2">Ví nội bộ</div>
                    <div className="display-6 fw-bold text-success">
                      {formatMoney(selectedDetail.user.balance)}
                    </div>
                    <div className="text-muted">
                      Đơn vị: {selectedDetail.user.currency || "VND"}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="g-3 mb-4">
                <Col md={3}>
                  <div className="admin-mini-summary">
                    <span>Đơn hàng</span>
                    <strong>{selectedDetail.summary.order_count || 0}</strong>
                    <small>{selectedDetail.summary.paid_order_count || 0} đã thanh toán</small>
                  </div>
                </Col>

                <Col md={3}>
                  <div className="admin-mini-summary">
                    <span>Tổng đã mua</span>
                    <strong>{formatMoney(selectedDetail.summary.total_paid_amount)}</strong>
                    <small>Đơn vé chính thức</small>
                  </div>
                </Col>

                <Col md={3}>
                  <div className="admin-mini-summary">
                    <span>Vé sở hữu</span>
                    <strong>{selectedDetail.summary.owned_ticket_count || 0}</strong>
                    <small>{selectedDetail.summary.active_ticket_count || 0} active</small>
                  </div>
                </Col>

                <Col md={3}>
                  <div className="admin-mini-summary">
                    <span>Tổng đã nạp</span>
                    <strong>{formatMoney(selectedDetail.summary.total_topup_amount)}</strong>
                    <small>{selectedDetail.summary.approved_topup_count || 0} lần duyệt</small>
                  </div>
                </Col>
              </Row>

              <Tabs defaultActiveKey="orders" className="mb-3">
                <Tab eventKey="orders" title="Đơn hàng gần đây">
                  {selectedDetail.orders.length === 0 ? (
                    <Alert variant="info">Người dùng chưa có đơn hàng.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Tổng tiền</th>
                          <th>Thanh toán</th>
                          <th>Đơn hàng</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.orders.map((order) => (
                          <tr key={order.id}>
                            <td className="fw-semibold">{order.order_code}</td>
                            <td>{formatMoney(order.total_amount)}</td>
                            <td>
                              <Badge bg={getStatusBadge(order.payment_status)}>
                                {renderStatus(order.payment_status)}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={getStatusBadge(order.order_status)}>
                                {renderStatus(order.order_status)}
                              </Badge>
                            </td>
                            <td>{formatDateTime(order.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                <Tab eventKey="tickets" title="Vé đang sở hữu">
                  {selectedDetail.tickets.length === 0 ? (
                    <Alert variant="info">Người dùng chưa sở hữu vé nào.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Mã vé</th>
                          <th>Show</th>
                          <th>Loại vé</th>
                          <th>Giá</th>
                          <th>Trạng thái</th>
                          <th>Mint</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.tickets.map((ticket) => (
                          <tr key={ticket.id}>
                            <td className="fw-semibold">{ticket.ticket_code}</td>
                            <td>
                              <div className="fw-semibold">{ticket.event_title}</div>
                              <div className="text-muted small">{formatDateTime(ticket.event_date)}</div>
                            </td>
                            <td>{ticket.ticket_type_name}</td>
                            <td>{formatMoney(ticket.unit_price)}</td>
                            <td>
                              <Badge bg={getStatusBadge(ticket.ticket_status)}>
                                {renderStatus(ticket.ticket_status)}
                              </Badge>
                            </td>
                            <td>{ticket.mint_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                <Tab eventKey="wallet" title="Giao dịch ví">
                  {selectedDetail.wallet_transactions.length === 0 ? (
                    <Alert variant="info">Chưa có giao dịch ví nội bộ.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Mã giao dịch</th>
                          <th>Loại</th>
                          <th>Số tiền</th>
                          <th>Số dư trước</th>
                          <th>Số dư sau</th>
                          <th>Ghi chú</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.wallet_transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="fw-semibold">{tx.transaction_code}</td>
                            <td>{tx.transaction_type}</td>
                            <td>{formatMoney(tx.amount)}</td>
                            <td>{formatMoney(tx.balance_before)}</td>
                            <td>{formatMoney(tx.balance_after)}</td>
                            <td>{tx.note || "Không có"}</td>
                            <td>{formatDateTime(tx.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                <Tab eventKey="topups" title="Yêu cầu nạp tiền">
                  {selectedDetail.topup_requests.length === 0 ? (
                    <Alert variant="info">Người dùng chưa có yêu cầu nạp tiền.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Mã nạp</th>
                          <th>Số tiền</th>
                          <th>Nội dung</th>
                          <th>Trạng thái</th>
                          <th>Admin note</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.topup_requests.map((topup) => (
                          <tr key={topup.id}>
                            <td className="fw-semibold">{topup.topup_code}</td>
                            <td>{formatMoney(topup.amount)}</td>
                            <td>{topup.transfer_content}</td>
                            <td>
                              <Badge bg={getStatusBadge(topup.status)}>
                                {renderStatus(topup.status)}
                              </Badge>
                            </td>
                            <td>{topup.admin_note || "Không có"}</td>
                            <td>{formatDateTime(topup.requested_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>
              </Tabs>
            </>
          ) : (
            <Alert variant="info">Không có dữ liệu.</Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminUserManagePage;