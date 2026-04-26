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
  Toast,
  ToastContainer,
} from "react-bootstrap";

import {
  adminGetTopupRequests,
  adminApproveTopupRequest,
  adminRejectTopupRequest,
} from "../../services/topupRequestService";

function AdminTopupRequestPage() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [status, setStatus] = useState("paid_submitted");
  const [search, setSearch] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getStatusBadge = (value) => {
    switch (value) {
      case "pending":
        return "warning";
      case "paid_submitted":
        return "info";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "cancelled":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const renderStatus = (value) => {
    switch (value) {
      case "pending":
        return "Chờ user thanh toán";
      case "paid_submitted":
        return "User đã báo thanh toán";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Bị từ chối";
      case "cancelled":
        return "User đã hủy";
      default:
        return value || "Không xác định";
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();

      const response = await adminGetTopupRequests(params);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được yêu cầu nạp tiền");
        return;
      }

      setRequests(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải yêu cầu nạp tiền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [status]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadRequests();
  };

  const handleApprove = async (request) => {
    const ok = window.confirm(
      `Duyệt yêu cầu ${request.topup_code} và cộng ${formatMoney(request.amount)} VND cho user?`
    );

    if (!ok) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await adminApproveTopupRequest({
        requestId: request.id,
        admin_note: "Admin đã kiểm tra thanh toán và duyệt nạp tiền",
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể duyệt yêu cầu nạp tiền");
        return;
      }

      setSuccess("Duyệt yêu cầu nạp tiền thành công. Số dư user đã được cộng.");
      setShowToast(true);

      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi duyệt yêu cầu nạp tiền");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setAdminNote("Admin từ chối yêu cầu nạp tiền");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await adminRejectTopupRequest({
        requestId: selectedRequest.id,
        admin_note: adminNote,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể từ chối yêu cầu nạp tiền");
        return;
      }

      setSuccess("Từ chối yêu cầu nạp tiền thành công.");
      setShowToast(true);
      setShowRejectModal(false);
      setSelectedRequest(null);

      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi từ chối yêu cầu nạp tiền");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Container className="admin-shell">
        <div className="section-title mb-2">Duyệt yêu cầu nạp tiền</div>
        <div className="section-subtitle mb-4">
          Admin kiểm tra thanh toán ngoài hệ thống rồi duyệt để cộng tiền vào ví nội bộ của user.
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="payment-card mb-4">
          <Card.Body>
            <Form onSubmit={handleSearchSubmit}>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="paid_submitted">User đã báo thanh toán</option>
                    <option value="pending">Chờ user thanh toán</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Bị từ chối</option>
                    <option value="cancelled">User đã hủy</option>
                  </Form.Select>
                </Col>

                <Col md={6}>
                  <Form.Label>Tìm kiếm</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Mã nạp, tên user, email, số điện thoại..."
                  />
                </Col>

                <Col md={2} className="d-flex align-items-end">
                  <Button type="submit" className="soft-button soft-button-primary w-100">
                    Lọc
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="payment-card">
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : requests.length === 0 ? (
              <Alert variant="info" className="mb-0">
                Không có yêu cầu nạp tiền nào phù hợp.
              </Alert>
            ) : (
              <Table responsive hover className="table-modern align-middle">
                <thead>
                  <tr>
                    <th>Mã nạp</th>
                    <th>User</th>
                    <th>Số tiền</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th>Ghi chú</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="fw-semibold">{request.topup_code}</td>

                      <td>
                        <div className="fw-semibold">{request.full_name}</div>
                        <div className="text-muted small">{request.email}</div>
                        <div className="text-muted small">{request.phone || "Không có SĐT"}</div>
                      </td>

                      <td>
                        <strong>
                          {formatMoney(request.amount)} {request.currency}
                        </strong>
                      </td>

                      <td>
                        <div className="small">
                          Phương thức: {request.payment_method}
                        </div>
                        <div className="small">
                          Nội dung: <strong>{request.transfer_content}</strong>
                        </div>
                        {request.proof_image_url && (
                          <a
                            href={request.proof_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="small"
                          >
                            Xem minh chứng
                          </a>
                        )}
                      </td>

                      <td>
                        <Badge bg={getStatusBadge(request.status)}>
                          {renderStatus(request.status)}
                        </Badge>
                      </td>

                      <td>
                        <div className="small">
                          Tạo: {formatDateTime(request.requested_at)}
                        </div>

                        {request.submitted_at && (
                          <div className="small text-muted">
                            Báo thanh toán: {formatDateTime(request.submitted_at)}
                          </div>
                        )}

                        {request.approved_at && (
                          <div className="small text-muted">
                            Duyệt: {formatDateTime(request.approved_at)}
                          </div>
                        )}

                        {request.rejected_at && (
                          <div className="small text-muted">
                            Từ chối: {formatDateTime(request.rejected_at)}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="small">
                          User: {request.payment_note || "Không có"}
                        </div>
                        {request.admin_note && (
                          <div className="small text-muted">
                            Admin: {request.admin_note}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        {request.status === "paid_submitted" ? (
                          <div className="d-flex justify-content-end gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleApprove(request)}
                              disabled={processing}
                            >
                              Duyệt
                            </Button>

                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => openRejectModal(request)}
                              disabled={processing}
                            >
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted small">Không thao tác</span>
                        )}
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
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Từ chối yêu cầu nạp tiền</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedRequest && (
            <Alert variant="warning">
              Bạn đang từ chối yêu cầu <strong>{selectedRequest.topup_code}</strong>{" "}
              với số tiền <strong>{formatMoney(selectedRequest.amount)} VND</strong>.
            </Alert>
          )}

          <Form.Group>
            <Form.Label>Lý do / ghi chú admin</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Nhập lý do từ chối"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowRejectModal(false)}
            disabled={processing}
          >
            Hủy
          </Button>

          <Button
            variant="danger"
            onClick={handleReject}
            disabled={processing}
          >
            {processing ? "Đang xử lý..." : "Xác nhận từ chối"}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer
        position="top-end"
        className="p-3"
        style={{ zIndex: 2000 }}
      >
        <Toast
          bg="success"
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={4500}
          autohide
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Thành công</strong>
            <small>Vừa xong</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            Yêu cầu nạp tiền đã được xử lý.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default AdminTopupRequestPage;