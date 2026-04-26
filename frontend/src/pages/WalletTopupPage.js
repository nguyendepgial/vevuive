import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
  Table,
  Badge,
  Modal,
  Toast,
  ToastContainer,
} from "react-bootstrap";

import {
  getMyWalletBalance,
  getMyWalletTransactions,
} from "../services/walletBalanceService";

import {
  createTopupRequest,
  getMyTopupRequests,
  submitPaidTopupRequest,
  cancelTopupRequest,
} from "../services/topupRequestService";

function WalletTopupPage() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);

  const [amount, setAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [createdPaymentInfo, setCreatedPaymentInfo] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitNote, setSubmitNote] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getStatusBadge = (status) => {
    switch (status) {
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

  const renderStatus = (status) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "paid_submitted":
        return "Đã gửi xác nhận";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Bị từ chối";
      case "cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const loadBalance = async () => {
    const response = await getMyWalletBalance();

    if (response.data?.success) {
      setBalance(response.data.data?.balance || null);
    }
  };

  const loadTransactions = async () => {
    const response = await getMyWalletTransactions({
      limit: 5,
    });

    if (response.data?.success) {
      setTransactions(Array.isArray(response.data.data) ? response.data.data : []);
    }
  };

  const loadTopupRequests = async () => {
    const response = await getMyTopupRequests();

    if (response.data?.success) {
      setTopupRequests(Array.isArray(response.data.data) ? response.data.data : []);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        loadBalance(),
        loadTransactions(),
        loadTopupRequests(),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải dữ liệu ví nội bộ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateTopup = async (event) => {
    event.preventDefault();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const parsedAmount = Number(amount);

      if (!parsedAmount || parsedAmount < 10000) {
        setError("Số tiền nạp tối thiểu là 10.000 VND.");
        return;
      }

      const response = await createTopupRequest({
        amount: parsedAmount,
        payment_method: "qr_transfer",
        payment_note: paymentNote,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể tạo yêu cầu nạp tiền");
        return;
      }

      setCreatedPaymentInfo(response.data.data);
      setShowPaymentModal(true);
      setSuccess("Tạo yêu cầu nạp tiền thành công. Vui lòng thanh toán theo thông tin hiển thị.");
      setShowToast(true);

      setAmount("");
      setPaymentNote("");

      await loadTopupRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tạo yêu cầu nạp tiền");
    } finally {
      setCreating(false);
    }
  };

  const openSubmitModal = (request) => {
    setSelectedRequest(request);
    setSubmitNote("Đã thanh toán theo nội dung chuyển khoản");
    setProofImageUrl("");
    setError("");
    setSuccess("");
    setShowSubmitModal(true);
  };

  const handleSubmitPaid = async () => {
    if (!selectedRequest) return;

    try {
      setSubmittingId(selectedRequest.id);
      setError("");
      setSuccess("");

      const response = await submitPaidTopupRequest({
        requestId: selectedRequest.id,
        payment_note: submitNote,
        proof_image_url: proofImageUrl,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể gửi xác nhận thanh toán");
        return;
      }

      setSuccess("Đã gửi xác nhận thanh toán. Vui lòng chờ admin duyệt.");
      setShowToast(true);
      setShowSubmitModal(false);
      setSelectedRequest(null);

      await loadTopupRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi gửi xác nhận thanh toán");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancel = async (requestId) => {
    const ok = window.confirm("Bạn có chắc muốn hủy yêu cầu nạp tiền này không?");
    if (!ok) return;

    try {
      setCancellingId(requestId);
      setError("");
      setSuccess("");

      const response = await cancelTopupRequest(requestId);

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể hủy yêu cầu nạp tiền");
        return;
      }

      setSuccess("Hủy yêu cầu nạp tiền thành công.");
      await loadTopupRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi hủy yêu cầu nạp tiền");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "70vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <Container className="user-shell">
        <div className="section-title mb-2">Ví nội bộ</div>
        <div className="section-subtitle mb-4">
          Tạo yêu cầu nạp tiền, thanh toán theo mã/nội dung chuyển khoản, sau đó chờ admin xác nhận.
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Row className="g-4">
          <Col lg={4}>
            <Card className="payment-card mb-4">
              <Card.Body className="p-4">
                <div className="text-muted mb-1">Số dư hiện tại</div>
                <div className="fw-bold display-6">
                  {formatMoney(balance?.balance)} {balance?.currency || "VND"}
                </div>
              </Card.Body>
            </Card>

            <Card className="payment-card">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Tạo yêu cầu nạp tiền</h5>

                <Form onSubmit={handleCreateTopup}>
                  <Form.Group className="mb-3">
                    <Form.Label>Số tiền muốn nạp</Form.Label>
                    <Form.Control
                      type="number"
                      min="10000"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="VD: 2000000"
                    />
                    <Form.Text className="text-muted">
                      Tối thiểu 10.000 VND.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Ghi chú</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={paymentNote}
                      onChange={(event) => setPaymentNote(event.target.value)}
                      placeholder="VD: Nạp tiền để mua vé"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="soft-button soft-button-primary w-100"
                    disabled={creating}
                  >
                    {creating ? "Đang tạo..." : "Tạo yêu cầu nạp tiền"}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="payment-card mb-4">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Yêu cầu nạp tiền của tôi</h5>

                {topupRequests.length === 0 ? (
                  <Alert variant="info" className="mb-0">
                    Bạn chưa có yêu cầu nạp tiền nào.
                  </Alert>
                ) : (
                  <Table responsive hover className="table-modern align-middle">
                    <thead>
                      <tr>
                        <th>Mã nạp</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Thời gian</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {topupRequests.map((request) => (
                        <tr key={request.id}>
                          <td className="fw-semibold">{request.topup_code}</td>

                          <td>
                            {formatMoney(request.amount)} {request.currency}
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
                                Gửi xác nhận: {formatDateTime(request.submitted_at)}
                              </div>
                            )}

                            {request.approved_at && (
                              <div className="small text-muted">
                                Duyệt: {formatDateTime(request.approved_at)}
                              </div>
                            )}
                          </td>

                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2 flex-wrap">
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => openSubmitModal(request)}
                                  >
                                    Tôi đã thanh toán
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleCancel(request.id)}
                                    disabled={cancellingId === request.id}
                                  >
                                    {cancellingId === request.id ? "Đang hủy..." : "Hủy"}
                                  </Button>
                                </>
                              )}

                              {request.status === "paid_submitted" && (
                                <span className="text-muted small">
                                  Chờ admin duyệt
                                </span>
                              )}

                              {request.status === "approved" && (
                                <span className="text-success small">
                                  Đã cộng tiền
                                </span>
                              )}

                              {request.status === "rejected" && (
                                <span className="text-danger small">
                                  Bị từ chối
                                </span>
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

            <Card className="payment-card">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Giao dịch ví gần đây</h5>

                {transactions.length === 0 ? (
                  <Alert variant="info" className="mb-0">
                    Chưa có giao dịch ví nội bộ.
                  </Alert>
                ) : (
                  <Table responsive hover className="table-modern align-middle">
                    <thead>
                      <tr>
                        <th>Mã giao dịch</th>
                        <th>Loại</th>
                        <th>Số tiền</th>
                        <th>Số dư sau</th>
                        <th>Thời gian</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="fw-semibold">
                            {transaction.transaction_code}
                          </td>

                          <td>{transaction.transaction_type}</td>

                          <td>
                            {formatMoney(transaction.amount)} {transaction.currency}
                          </td>

                          <td>
                            {formatMoney(transaction.balance_after)} {transaction.currency}
                          </td>

                          <td>{formatDateTime(transaction.created_at)}</td>
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

      <Modal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Thông tin thanh toán</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {createdPaymentInfo && (
            <>
              <Alert variant="info">
                Vui lòng thanh toán đúng số tiền và đúng nội dung chuyển khoản.
                Sau đó bấm "Tôi đã thanh toán" trong danh sách yêu cầu.
              </Alert>

              <div className="payment-summary-box mb-3">
                <div className="fw-bold mb-2">Yêu cầu nạp tiền</div>
                <div>Mã nạp: {createdPaymentInfo.request.topup_code}</div>
                <div>
                  Số tiền: {formatMoney(createdPaymentInfo.request.amount)}{" "}
                  {createdPaymentInfo.request.currency}
                </div>
                <div>
                  Nội dung chuyển khoản:{" "}
                  <strong>{createdPaymentInfo.request.transfer_content}</strong>
                </div>
              </div>

              <div className="payment-summary-box">
                <div className="fw-bold mb-2">Thông tin nhận tiền demo</div>
                <div>Ngân hàng: {createdPaymentInfo.payment_info.bank_name}</div>
                <div>Số tài khoản: {createdPaymentInfo.payment_info.bank_account}</div>
                <div>Chủ tài khoản: {createdPaymentInfo.payment_info.bank_owner}</div>
                <div>
                  Nội dung:{" "}
                  <strong>{createdPaymentInfo.payment_info.transfer_content}</strong>
                </div>

                {createdPaymentInfo.payment_info.qr_image_url && (
                  <div className="mt-3 text-center">
                    <img
                      src={createdPaymentInfo.payment_info.qr_image_url}
                      alt="QR nạp tiền"
                      style={{
                        maxWidth: "220px",
                        width: "100%",
                        borderRadius: "16px",
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowPaymentModal(false)}
          >
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showSubmitModal}
        onHide={() => setShowSubmitModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận đã thanh toán</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedRequest && (
            <>
              <Alert variant="warning">
                Chỉ bấm xác nhận sau khi bạn đã thanh toán đúng nội dung:
                <br />
                <strong>{selectedRequest.transfer_content}</strong>
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Ghi chú thanh toán</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={submitNote}
                  onChange={(event) => setSubmitNote(event.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Link ảnh minh chứng nếu có</Form.Label>
                <Form.Control
                  value={proofImageUrl}
                  onChange={(event) => setProofImageUrl(event.target.value)}
                  placeholder="Dán link ảnh minh chứng nếu có"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowSubmitModal(false)}
            disabled={submittingId === selectedRequest?.id}
          >
            Hủy
          </Button>

          <Button
            className="soft-button soft-button-primary"
            onClick={handleSubmitPaid}
            disabled={submittingId === selectedRequest?.id}
          >
            {submittingId === selectedRequest?.id
              ? "Đang gửi..."
              : "Gửi xác nhận"}
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
            Thao tác ví nội bộ đã được xử lý thành công.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default WalletTopupPage;