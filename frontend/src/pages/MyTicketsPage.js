import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Alert,
  Spinner,
  Button,
} from "react-bootstrap";
import QRCode from "react-qr-code";
import api from "../services/api";

function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "used":
        return "primary";
      case "transfer_pending":
        return "warning";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case "active":
        return "Có hiệu lực";
      case "used":
        return "Đã check-in";
      case "transfer_pending":
        return "Đang chuyển nhượng";
      case "cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users/tickets");

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được danh sách vé");
        return;
      }

      setTickets(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải vé của tôi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const copyTicketCode = async (ticketCode) => {
    try {
      await navigator.clipboard.writeText(ticketCode);
      alert("Đã copy mã vé");
    } catch (err) {
      alert("Không thể copy mã vé");
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
    <Container className="user-shell">
      <div className="section-title mb-2">Vé của tôi</div>
      <div className="section-subtitle mb-4">
        Mỗi vé có một QR riêng. Admin có thể quét QR này tại cổng check-in.
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {tickets.length === 0 ? (
        <Card className="payment-card">
          <Card.Body className="text-center py-5">
            <h5>Bạn chưa có vé nào</h5>
            <div className="text-muted">
              Sau khi thanh toán đơn hàng, vé sẽ xuất hiện tại đây.
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {tickets.map((ticket) => (
            <Col md={6} xl={4} key={ticket.id}>
              <Card className="ticket-qr-card h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">{ticket.event_title}</h5>
                      <div className="text-muted small">
                        {ticket.ticket_type_name}
                      </div>
                    </div>

                    <Badge bg={getStatusBadge(ticket.ticket_status)}>
                      {renderStatus(ticket.ticket_status)}
                    </Badge>
                  </div>

                  <div className="ticket-qr-box mb-3">
                    <QRCode
                      value={ticket.ticket_code}
                      size={190}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        width: "100%",
                      }}
                    />
                  </div>

                  <div className="payment-summary-box mb-3">
                    <div className="text-muted small">Mã vé</div>
                    <div className="fw-bold text-break">{ticket.ticket_code}</div>

                    <div className="text-muted small mt-2">Ngày diễn ra</div>
                    <div>{formatDateTime(ticket.event_date)}</div>

                    <div className="text-muted small mt-2">Giá vé</div>
                    <div>{formatMoney(ticket.unit_price)}</div>

                    <div className="text-muted small mt-2">Ví sở hữu</div>
                    <div className="text-break">{ticket.owner_wallet_address}</div>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => copyTicketCode(ticket.ticket_code)}
                    >
                      Copy mã vé
                    </Button>

                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={loadTickets}
                    >
                      Làm mới
                    </Button>
                  </div>

                  {ticket.ticket_status === "used" && (
                    <Alert variant="info" className="mt-3 mb-0">
                      Vé này đã được check-in và không thể dùng lại.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default MyTicketsPage;