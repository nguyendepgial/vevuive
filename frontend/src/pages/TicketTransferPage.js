import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
import api from "../services/api";
import {
  createTransferRequest,
  getMyTransferRequests,
  cancelMyTransferRequest,
} from "../services/transferService";

function TicketTransferPage() {
  const location = useLocation();

  const [tickets, setTickets] = useState([]);
  const [sentTransfers, setSentTransfers] = useState([]);

  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [formData, setFormData] = useState({
    receiver_wallet_address: "",
    transfer_type: "gift",
    asking_price: 0,
    note: "",
    expires_in_minutes: "",
  });

  const fetchMyTickets = async () => {
    try {
      setLoadingTickets(true);

      // Nếu backend của bạn dùng route khác cho vé của user,
      // chỉ cần đổi dòng này.
      const response = await api.get("/users/tickets", {
        params: { status: "active", limit: 100 },
      });

      if (response.data?.success) {
        setTickets(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setTickets([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách vé của bạn");
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchSentTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const response = await getMyTransferRequests({ limit: 50 });

      if (response.data?.success) {
        setSentTransfers(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setSentTransfers([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải yêu cầu chuyển nhượng đã gửi");
    } finally {
      setLoadingTransfers(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
    fetchSentTransfers();
  }, []);

  const transferableTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const statusOk = ticket.ticket_status === "active";
      const mintOk = ticket.mint_status === "minted";
      const transferCountOk = Number(ticket.transferred_count || 0) < 1;
      return statusOk && mintOk && transferCountOk;
    });
  }, [tickets]);

  const resetForm = () => {
    setFormData({
      receiver_wallet_address: "",
      transfer_type: "gift",
      asking_price: 0,
      note: "",
      expires_in_minutes: "",
    });
  };

  const handleOpenModal = (ticket) => {
    setSelectedTicket(ticket);
    resetForm();
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
    resetForm();
  };

  useEffect(() => {
    const preselectedTicket = location.state?.selectedTicket;

    if (!preselectedTicket || !tickets.length) return;

    const matchedTicket = tickets.find(
      (ticket) => Number(ticket.id) === Number(preselectedTicket.id)
    );

    if (matchedTicket) {
      setSelectedTicket(matchedTicket);
      resetForm();
      setShowModal(true);
    }
  }, [location.state, tickets]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "asking_price"
          ? value === ""
            ? ""
            : Number(value)
          : value,
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

  const validateBeforeSubmit = () => {
    if (!selectedTicket) {
      return "Bạn chưa chọn vé để chuyển nhượng";
    }

    if (!formData.receiver_wallet_address.trim()) {
      return "Vui lòng nhập địa chỉ ví người nhận";
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.receiver_wallet_address.trim())) {
      return "Địa chỉ ví người nhận không đúng định dạng";
    }

    if (formData.transfer_type === "resale_private") {
      const price = Number(formData.asking_price || 0);
      const originalPrice = Number(selectedTicket.unit_price || 0);

      if (price <= 0) {
        return "Giá chuyển nhượng phải lớn hơn 0";
      }

      if (price > originalPrice) {
        return "Giá chuyển nhượng phải nhỏ hơn hoặc bằng giá gốc của vé";
      }
    }

    return "";
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setError(validationMessage);
      setSubmitting(false);
      return;
    }

    try {
      const response = await createTransferRequest({
        ticket_id: selectedTicket.id,
        receiver_wallet_address: formData.receiver_wallet_address.trim(),
        transfer_type: formData.transfer_type,
        asking_price:
          formData.transfer_type === "gift"
            ? 0
            : Number(formData.asking_price || 0),
        note: formData.note.trim(),
        expires_in_minutes:
          formData.expires_in_minutes !== ""
            ? Number(formData.expires_in_minutes)
            : undefined,
      });

      if (response.data?.success) {
        setSuccess(response.data.message || "Tạo yêu cầu chuyển nhượng thành công");
        handleCloseModal();
        await fetchSentTransfers();
        await fetchMyTickets();
      } else {
        setError(response.data?.message || "Không thể tạo yêu cầu chuyển nhượng");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tạo yêu cầu chuyển nhượng");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTransfer = async (transferId) => {
    const ok = window.confirm("Bạn có chắc muốn hủy yêu cầu chuyển nhượng này không?");
    if (!ok) return;

    try {
      setCancellingId(transferId);
      setError("");
      setSuccess("");

      const response = await cancelMyTransferRequest(transferId);

      if (response.data?.success) {
        setSuccess(response.data.message || "Hủy yêu cầu chuyển nhượng thành công");
        await fetchSentTransfers();
      } else {
        setError(response.data?.message || "Không thể hủy yêu cầu");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi hủy yêu cầu chuyển nhượng");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Container className="user-shell">
      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="hero-card">
            <Card.Body className="p-4 p-lg-5">
              <div className="hero-title mb-2" style={{ fontSize: "2rem" }}>
                Chuyển nhượng vé
              </div>
              <div className="hero-text">
                Bạn có thể tặng vé miễn phí hoặc chuyển nhượng riêng cho một người nhận cụ thể bằng địa chỉ ví.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="profile-card">
            <Card.Body className="p-4">
              <div className="section-title mb-2" style={{ fontSize: "1.6rem" }}>
                Vé có thể chuyển nhượng
              </div>
              <div className="section-subtitle mb-4">
                Chỉ hiển thị các vé đang active, đã mint NFT và chưa vượt quá số lần chuyển nhượng cho phép.
              </div>

              {loadingTickets ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : transferableTickets.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  Hiện không có vé nào đủ điều kiện để chuyển nhượng.
                </div>
              ) : (
                <Row className="g-4">
                  {transferableTickets.map((ticket) => (
                    <Col lg={6} key={ticket.id}>
                      <Card className="h-100 border rounded-4 shadow-sm">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                            <div>
                              <div className="fw-bold fs-5">
                                {ticket.event_title || ticket.ticket_type_name_snapshot || "Vé sự kiện"}
                              </div>
                              <div className="text-muted">
                                Mã vé: {ticket.ticket_code}
                              </div>
                            </div>

                            <Badge bg="success">Có thể chuyển</Badge>
                          </div>

                          <div className="mb-2">
                            <strong>Giá gốc:</strong>{" "}
                            {Number(ticket.unit_price || 0).toLocaleString("vi-VN")} VND
                          </div>

                          <div className="mb-2">
                            <strong>Trạng thái vé:</strong> {ticket.ticket_status}
                          </div>

                          <div className="mb-3">
                            <strong>Số lần đã chuyển:</strong> {ticket.transferred_count || 0}
                          </div>

                          <Button
                            className="soft-button soft-button-primary"
                            onClick={() => handleOpenModal(ticket)}
                          >
                            Tạo yêu cầu chuyển nhượng
                          </Button>
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
                Yêu cầu chuyển nhượng đã gửi
              </div>
              <div className="section-subtitle mb-4">
                Theo dõi các yêu cầu bạn đã gửi cho người nhận.
              </div>

              {loadingTransfers ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : sentTransfers.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  Bạn chưa tạo yêu cầu chuyển nhượng nào.
                </div>
              ) : (
                <Table responsive hover className="table-modern align-middle">
                  <thead>
                    <tr>
                      <th>Mã vé</th>
                      <th>Sự kiện</th>
                      <th>Loại</th>
                      <th>Giá</th>
                      <th>Người nhận</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentTransfers.map((transfer) => (
                      <tr key={transfer.id}>
                        <td className="fw-bold">{transfer.ticket_code}</td>
                        <td>{transfer.event_title}</td>
                        <td>{renderTransferTypeText(transfer.transfer_type)}</td>
                        <td>
                          {Number(transfer.asking_price || 0).toLocaleString("vi-VN")} VND
                        </td>
                        <td>
                          <div>{transfer.to_user_name || "Người nhận"}</div>
                          <small className="text-muted">{transfer.to_wallet_address}</small>
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
                            <Button
                              size="sm"
                              className="soft-button soft-button-outline"
                              onClick={() => handleCancelTransfer(transfer.id)}
                              disabled={cancellingId === transfer.id}
                            >
                              {cancellingId === transfer.id ? "Đang hủy..." : "Hủy yêu cầu"}
                            </Button>
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

      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Tạo yêu cầu chuyển nhượng</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCreateTransfer}>
          <Modal.Body>
            {selectedTicket && (
              <Alert variant="info">
                <div><strong>Mã vé:</strong> {selectedTicket.ticket_code}</div>
                <div><strong>Giá gốc:</strong> {Number(selectedTicket.unit_price || 0).toLocaleString("vi-VN")} VND</div>
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Loại chuyển nhượng</Form.Label>
              <Form.Select
                name="transfer_type"
                value={formData.transfer_type}
                onChange={handleChange}
              >
                <option value="gift">Tặng vé</option>
                <option value="resale_private">Chuyển nhượng riêng có thu tiền</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Địa chỉ ví người nhận</Form.Label>
              <Form.Control
                type="text"
                name="receiver_wallet_address"
                value={formData.receiver_wallet_address}
                onChange={handleChange}
                placeholder="Nhập ví người nhận dạng 0x..."
                required
              />
            </Form.Group>

            {formData.transfer_type === "resale_private" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Giá chuyển nhượng</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={Number(selectedTicket?.unit_price || 0)}
                    name="asking_price"
                    value={formData.asking_price}
                    onChange={handleChange}
                    placeholder="Nhập số tiền cần người nhận thanh toán"
                    required
                  />
                  <Form.Text className="text-muted">
                    Giá phải nhỏ hơn hoặc bằng giá gốc của vé.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Thời gian hết hạn yêu cầu (phút)</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    name="expires_in_minutes"
                    value={formData.expires_in_minutes}
                    onChange={handleChange}
                    placeholder="Ví dụ: 60"
                  />
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Nhập lời nhắn cho người nhận"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button type="submit" className="soft-button soft-button-primary" disabled={submitting}>
              {submitting ? "Đang tạo..." : "Tạo yêu cầu"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default TicketTransferPage;