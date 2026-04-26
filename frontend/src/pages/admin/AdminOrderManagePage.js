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
} from "react-bootstrap";

import {
  adminGetOrders,
  adminGetOrderDetail,
  adminUpdateOrderStatus,
} from "../../services/adminOrderManageService";

function AdminOrderManagePage() {
  const [orders, setOrders] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [editOrderStatus, setEditOrderStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
      case "completed":
      case "success":
      case "active":
        return "success";

      case "pending":
      case "awaiting_payment":
      case "processing":
        return "warning";

      case "failed":
      case "cancelled":
      case "expired":
      case "refunded":
        return "danger";

      default:
        return "secondary";
    }
  };

  const renderStatus = (status) => {
    const map = {
      pending: "Chờ thanh toán",
      paid: "Đã thanh toán",
      failed: "Thất bại",
      expired: "Hết hạn",
      refunded: "Đã hoàn tiền",
      awaiting_payment: "Chờ thanh toán",
      processing: "Đang xử lý",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
      success: "Thành công",
      active: "Active",
    };

    return map[status] || status || "Không xác định";
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: 1,
        limit: 20,
      };

      if (search.trim()) params.search = search.trim();
      if (paymentStatus) params.payment_status = paymentStatus;
      if (orderStatus) params.order_status = orderStatus;

      const response = await adminGetOrders(params);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được danh sách đơn hàng");
        return;
      }

      setOrders(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [paymentStatus, orderStatus]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadOrders();
  };

  const openDetail = async (orderId) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedDetail(null);
      setShowDetailModal(true);

      const response = await adminGetOrderDetail(orderId);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được chi tiết đơn hàng");
        return;
      }

      setSelectedDetail(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi lấy chi tiết đơn hàng");
    } finally {
      setDetailLoading(false);
    }
  };

  const openStatusModal = (order) => {
    setSelectedDetail({
      order,
      items: [],
      payments: [],
      tickets: [],
    });

    setEditOrderStatus(order.order_status || "");
    setEditPaymentStatus(order.payment_status || "");
    setCancelReason(order.cancel_reason || "");
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedDetail?.order) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await adminUpdateOrderStatus({
        orderId: selectedDetail.order.id,
        order_status: editOrderStatus,
        payment_status: editPaymentStatus,
        cancel_reason: cancelReason,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể cập nhật trạng thái");
        return;
      }

      setSuccess("Cập nhật trạng thái đơn hàng thành công.");
      setShowStatusModal(false);
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật trạng thái đơn hàng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Container fluid className="admin-dashboard-page">
        <div className="admin-hero-panel admin-compact-hero">
          <div>
            <div className="admin-hero-eyebrow">Quản lý nghiệp vụ</div>
            <h2>Quản lý đơn hàng</h2>
            <p>
              Theo dõi đơn đặt vé, trạng thái thanh toán, vé đã phát hành và lịch sử payment.
            </p>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="admin-glass-card mb-4">
          <Card.Body className="p-4">
            <Form onSubmit={handleSearchSubmit}>
              <Row className="g-3">
                <Col lg={5}>
                  <Form.Label>Tìm kiếm</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Mã đơn, tên user, email, số điện thoại..."
                  />
                </Col>

                <Col lg={3}>
                  <Form.Label>Thanh toán</Form.Label>
                  <Form.Select
                    value={paymentStatus}
                    onChange={(event) => setPaymentStatus(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="pending">Chờ thanh toán</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="failed">Thất bại</option>
                    <option value="expired">Hết hạn</option>
                    <option value="refunded">Hoàn tiền</option>
                  </Form.Select>
                </Col>

                <Col lg={3}>
                  <Form.Label>Đơn hàng</Form.Label>
                  <Form.Select
                    value={orderStatus}
                    onChange={(event) => setOrderStatus(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="awaiting_payment">Chờ thanh toán</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="completed">Hoàn tất</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="expired">Hết hạn</option>
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
            ) : orders.length === 0 ? (
              <Alert variant="info" className="mb-0">
                Không có đơn hàng nào phù hợp.
              </Alert>
            ) : (
              <Table responsive hover className="table-modern admin-modern-table align-middle">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Tổng tiền</th>
                    <th>Số lượng</th>
                    <th>Thanh toán</th>
                    <th>Đơn hàng</th>
                    <th>Vé</th>
                    <th>Thời gian</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="fw-semibold">{order.order_code}</td>

                      <td>
                        <div className="fw-semibold">{order.full_name}</div>
                        <div className="text-muted small">{order.email}</div>
                      </td>

                      <td>{formatMoney(order.total_amount)}</td>

                      <td>
                        <div>{order.total_quantity} vé</div>
                        <div className="text-muted small">{order.item_count} loại</div>
                      </td>

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

                      <td>
                        <div className="fw-semibold">{order.issued_ticket_count}</div>
                        <div className="text-muted small">đã phát hành</div>
                      </td>

                      <td>
                        <div>{formatDateTime(order.created_at)}</div>
                        {order.paid_at && (
                          <div className="text-muted small">
                            Paid: {formatDateTime(order.paid_at)}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openDetail(order.id)}
                          >
                            Chi tiết
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => openStatusModal(order)}
                          >
                            Trạng thái
                          </Button>
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
          <Modal.Title>Chi tiết đơn hàng</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : selectedDetail ? (
            <>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Thông tin đơn</div>
                    <div>Mã đơn: {selectedDetail.order.order_code}</div>
                    <div>Tổng tiền: {formatMoney(selectedDetail.order.total_amount)}</div>
                    <div>
                      Thanh toán:{" "}
                      <Badge bg={getStatusBadge(selectedDetail.order.payment_status)}>
                        {renderStatus(selectedDetail.order.payment_status)}
                      </Badge>
                    </div>
                    <div>
                      Đơn hàng:{" "}
                      <Badge bg={getStatusBadge(selectedDetail.order.order_status)}>
                        {renderStatus(selectedDetail.order.order_status)}
                      </Badge>
                    </div>
                    <div>Tạo lúc: {formatDateTime(selectedDetail.order.created_at)}</div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Khách hàng</div>
                    <div>{selectedDetail.order.full_name}</div>
                    <div>{selectedDetail.order.email}</div>
                    <div>{selectedDetail.order.phone || "Không có SĐT"}</div>
                    <div>Trạng thái user: {selectedDetail.order.user_status}</div>
                  </div>
                </Col>
              </Row>

              <h5 className="fw-bold mb-3">Chi tiết vé đặt</h5>
              <Table responsive hover className="table-modern admin-modern-table align-middle mb-4">
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>Loại vé</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedDetail.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.event_title || "Không rõ"}</div>
                        <div className="text-muted small">{item.event_location || ""}</div>
                      </td>
                      <td>{item.ticket_type_name_snapshot}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unit_price)}</td>
                      <td>{formatMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <h5 className="fw-bold mb-3">Payment</h5>
              {selectedDetail.payments.length === 0 ? (
                <Alert variant="info">Đơn hàng chưa có payment.</Alert>
              ) : (
                <Table responsive hover className="table-modern admin-modern-table align-middle mb-4">
                  <thead>
                    <tr>
                      <th>Mã payment</th>
                      <th>Phương thức</th>
                      <th>Số tiền</th>
                      <th>Ví trả</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedDetail.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="fw-semibold">{payment.payment_code}</td>
                        <td>{payment.payment_method === "demo" ? "Ví nội bộ" : payment.payment_method}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td className="text-break">{payment.payer_wallet_address || "Không có"}</td>
                        <td>
                          <Badge bg={getStatusBadge(payment.status)}>
                            {renderStatus(payment.status)}
                          </Badge>
                        </td>
                        <td>{formatDateTime(payment.paid_at || payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <h5 className="fw-bold mb-3">Vé đã phát hành</h5>
              {selectedDetail.tickets.length === 0 ? (
                <Alert variant="info">Đơn hàng chưa phát hành vé.</Alert>
              ) : (
                <Table responsive hover className="table-modern admin-modern-table align-middle">
                  <thead>
                    <tr>
                      <th>Mã vé</th>
                      <th>Show</th>
                      <th>Chủ sở hữu</th>
                      <th>Ví owner</th>
                      <th>Trạng thái</th>
                      <th>Mint</th>
                      <th>Chuyển nhượng</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedDetail.tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="fw-semibold">{ticket.ticket_code}</td>
                        <td>{ticket.event_title}</td>
                        <td>
                          <div className="fw-semibold">{ticket.owner_name}</div>
                          <div className="text-muted small">{ticket.owner_email}</div>
                        </td>
                        <td className="text-break">{ticket.owner_wallet_address}</td>
                        <td>
                          <Badge bg={getStatusBadge(ticket.ticket_status)}>
                            {renderStatus(ticket.ticket_status)}
                          </Badge>
                        </td>
                        <td>{ticket.mint_status}</td>
                        <td>{ticket.transferred_count} lần</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
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

      <Modal
        show={showStatusModal}
        onHide={() => setShowStatusModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Cập nhật trạng thái đơn</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedDetail?.order && (
            <Alert variant="info">
              Đơn hàng: <strong>{selectedDetail.order.order_code}</strong>
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Trạng thái đơn hàng</Form.Label>
            <Form.Select
              value={editOrderStatus}
              onChange={(event) => setEditOrderStatus(event.target.value)}
            >
              <option value="">Không đổi</option>
              <option value="awaiting_payment">Chờ thanh toán</option>
              <option value="processing">Đang xử lý</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
              <option value="expired">Hết hạn</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Trạng thái thanh toán</Form.Label>
            <Form.Select
              value={editPaymentStatus}
              onChange={(event) => setEditPaymentStatus(event.target.value)}
            >
              <option value="">Không đổi</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="failed">Thất bại</option>
              <option value="expired">Hết hạn</option>
              <option value="refunded">Hoàn tiền</option>
            </Form.Select>
          </Form.Group>

          {editOrderStatus === "cancelled" && (
            <Form.Group>
              <Form.Label>Lý do hủy</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </Form.Group>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowStatusModal(false)}
            disabled={saving}
          >
            Hủy
          </Button>

          <Button
            className="soft-button soft-button-primary"
            onClick={handleSaveStatus}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu trạng thái"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminOrderManagePage;