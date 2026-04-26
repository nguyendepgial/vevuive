import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  getIncomingTransferRequests,
  respondToTransferRequest,
} from "../services/transferService";

function MyIncomingTransfersPage() {
  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const [acceptForm, setAcceptForm] = useState({
    payment_method: "demo",
    gateway_transaction_id: "",
    blockchain_tx_hash: "",
  });

  const fetchIncomingTransfers = async () => {
    try {
      setLoading(true);
      const response = await getIncomingTransferRequests({ limit: 50 });

      if (response.data?.success) {
        setIncomingTransfers(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setIncomingTransfers([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách yêu cầu nhận vé");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomingTransfers();
  }, []);

  const handleOpenAcceptModal = (transfer) => {
    setSelectedTransfer(transfer);
    setAcceptForm({
      payment_method: "demo",
      gateway_transaction_id: "",
      blockchain_tx_hash: "",
    });
    setShowAcceptModal(true);
    setError("");
    setSuccess("");
  };

  const handleCloseAcceptModal = () => {
    setShowAcceptModal(false);
    setSelectedTransfer(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAcceptForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getTransferStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "completed":
        return "success";
      case "rejected":
        return "danger";
      case "cancelled":
        return "secondary";
      case "failed":
        return "dark";
      default:
        return "secondary";
    }
  };

  const renderTransferStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Đang chờ";
      case "completed":
        return "Hoàn tất";
      case "rejected":
        return "Bị từ chối";
      case "cancelled":
        return "Đã hủy";
      case "failed":
        return "Thất bại";
      default:
        return status || "Không xác định";
    }
  };

  const renderTransferTypeText = (type) => {
    switch (type) {
      case "gift":
        return "Tặng vé";
      case "resale_private":
        return "Chuyển nhượng riêng";
      default:
        return type || "Không xác định";
    }
  };

  const handleReject = async (transferId) => {
    const ok = window.confirm("Bạn có chắc muốn từ chối yêu cầu nhận vé này không?");
    if (!ok) return;

    try {
      setProcessingId(transferId);
      setError("");
      setSuccess("");

      const response = await respondToTransferRequest({
        transferId,
        action: "reject",
      });

      if (response.data?.success) {
        setSuccess(response.data.message || "Đã từ chối yêu cầu chuyển nhượng");
        await fetchIncomingTransfers();
      } else {
        setError(response.data?.message || "Không thể từ chối yêu cầu");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi từ chối yêu cầu");
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccept = async () => {
    if (!selectedTransfer) return;

    try {
      setProcessingId(selectedTransfer.id);
      setError("");
      setSuccess("");

      const response = await respondToTransferRequest({
        transferId: selectedTransfer.id,
        action: "accept",
        payment_method: acceptForm.payment_method,
        gateway_transaction_id: acceptForm.gateway_transaction_id.trim(),
        blockchain_tx_hash: acceptForm.blockchain_tx_hash.trim(),
      });

      if (response.data?.success) {
        setSuccess(response.data.message || "Nhận vé thành công");
        setShowAcceptModal(false);
        await fetchIncomingTransfers();
      } else {
        setError(response.data?.message || "Không thể xử lý yêu cầu");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi xác nhận nhận vé");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Container className="user-shell">
      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="hero-card">
            <Card.Body className="p-4 p-lg-5">
              <div className="hero-title mb-2" style={{ fontSize: "2rem" }}>
                Yêu cầu nhận vé
              </div>
              <div className="hero-text">
                Xem các vé người khác đang muốn tặng hoặc chuyển nhượng riêng cho bạn.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row className="g-4">
        <Col lg={12}>
          <Card className="profile-card">
            <Card.Body className="p-4">
              <div className="section-title mb-2" style={{ fontSize: "1.6rem" }}>
                Danh sách yêu cầu nhận vé
              </div>
              <div className="section-subtitle mb-4">
                Nếu là vé tặng, bạn đồng ý là vé sẽ chuyển ngay. Nếu là vé chuyển nhượng riêng, hệ thống sẽ ghi nhận thanh toán rồi chuyển vé cho bạn.
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : incomingTransfers.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  Hiện chưa có yêu cầu nhận vé nào dành cho bạn.
                </div>
              ) : (
                <Table responsive hover className="table-modern align-middle">
                  <thead>
                    <tr>
                      <th>Mã vé</th>
                      <th>Sự kiện</th>
                      <th>Người gửi</th>
                      <th>Loại</th>
                      <th>Giá</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingTransfers.map((transfer) => (
                      <tr key={transfer.id}>
                        <td className="fw-bold">{transfer.ticket_code}</td>
                        <td>{transfer.event_title}</td>
                        <td>
                          <div>{transfer.from_user_name}</div>
                          <small className="text-muted">{transfer.from_wallet_address}</small>
                        </td>
                        <td>{renderTransferTypeText(transfer.transfer_type)}</td>
                        <td>
                          {Number(transfer.asking_price || 0).toLocaleString("vi-VN")} VND
                        </td>
                        <td>
                          <Badge
                            bg={getTransferStatusBadge(transfer.status)}
                            className="status-badge"
                          >
                            {renderTransferStatusText(transfer.status)}
                          </Badge>
                        </td>
                        <td>
                          {transfer.created_at
                            ? new Date(transfer.created_at).toLocaleString("vi-VN")
                            : "—"}
                        </td>
                        <td className="text-end">
                          {transfer.status === "pending" && (
                            <div className="d-flex gap-2 justify-content-end flex-wrap">
                              <Button
                                size="sm"
                                className="soft-button soft-button-primary"
                                onClick={() => handleOpenAcceptModal(transfer)}
                                disabled={processingId === transfer.id}
                              >
                                Đồng ý
                              </Button>

                              <Button
                                size="sm"
                                className="soft-button soft-button-outline"
                                onClick={() => handleReject(transfer.id)}
                                disabled={processingId === transfer.id}
                              >
                                {processingId === transfer.id ? "Đang xử lý..." : "Từ chối"}
                              </Button>
                            </div>
                          )}
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

      <Modal show={showAcceptModal} onHide={handleCloseAcceptModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận nhận vé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedTransfer && (
            <>
              <div className="mb-2">
                <strong>Mã vé:</strong> {selectedTransfer.ticket_code}
              </div>
              <div className="mb-2">
                <strong>Sự kiện:</strong> {selectedTransfer.event_title}
              </div>
              <div className="mb-2">
                <strong>Người gửi:</strong> {selectedTransfer.from_user_name}
              </div>
              <div className="mb-3">
                <strong>Loại chuyển nhượng:</strong>{" "}
                {renderTransferTypeText(selectedTransfer.transfer_type)}
              </div>

              {selectedTransfer.transfer_type === "resale_private" ? (
                <>
                  <Alert variant="warning">
                    Bạn cần đồng ý thanh toán{" "}
                    <strong>
                      {Number(selectedTransfer.asking_price || 0).toLocaleString("vi-VN")} VND
                    </strong>{" "}
                    để nhận vé này.
                  </Alert>

                  <Form.Group className="mb-3">
                    <Form.Label>Phương thức thanh toán</Form.Label>
                    <Form.Select
                      name="payment_method"
                      value={acceptForm.payment_method}
                      onChange={handleChange}
                    >
                      <option value="demo">Demo</option>
                      <option value="metamask">Metamask</option>
                      <option value="bank_transfer">Chuyển khoản</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="stripe">Stripe</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Mã giao dịch cổng thanh toán</Form.Label>
                    <Form.Control
                      type="text"
                      name="gateway_transaction_id"
                      value={acceptForm.gateway_transaction_id}
                      onChange={handleChange}
                      placeholder="Có thể để trống nếu test demo"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Blockchain tx hash</Form.Label>
                    <Form.Control
                      type="text"
                      name="blockchain_tx_hash"
                      value={acceptForm.blockchain_tx_hash}
                      onChange={handleChange}
                      placeholder="Có thể để trống nếu không dùng"
                    />
                  </Form.Group>
                </>
              ) : (
                <Alert variant="success">
                  Đây là vé được tặng miễn phí. Nếu bạn đồng ý, vé sẽ được chuyển thẳng vào tài khoản của bạn.
                </Alert>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAcceptModal}>
            Hủy
          </Button>
          <Button
            className="soft-button soft-button-primary"
            onClick={handleAccept}
            disabled={processingId === selectedTransfer?.id}
          >
            {processingId === selectedTransfer?.id ? "Đang xử lý..." : "Xác nhận đồng ý"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default MyIncomingTransfersPage;