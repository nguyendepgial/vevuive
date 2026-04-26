import { useEffect, useRef, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  Table,
} from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";

import {
  adminLookupTicketForCheckin,
  adminCheckinTicket,
  adminGetCheckinLogs,
} from "../../services/adminCheckinService";

function AdminCheckinPage() {
  const scannerRef = useRef(null);
  const scannerRegionId = "admin-qr-reader";

  const [code, setCode] = useState("");
  const [ticketInfo, setTicketInfo] = useState(null);
  const [logs, setLogs] = useState([]);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

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
      case "active":
      case "success":
        return "success";
      case "used":
        return "primary";
      case "transfer_pending":
      case "pending":
        return "warning";
      case "cancelled":
      case "failed":
        return "danger";
      default:
        return "secondary";
    }
  };

  const renderStatus = (status) => {
    const map = {
      active: "Có hiệu lực",
      used: "Đã check-in",
      transfer_pending: "Đang chuyển nhượng",
      cancelled: "Đã hủy",
      success: "Thành công",
      failed: "Thất bại",
      pending: "Chờ xử lý",
    };

    return map[status] || status || "Không xác định";
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);

      const response = await adminGetCheckinLogs({
        limit: 10,
      });

      if (response.data?.success) {
        setLogs(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (err) {
      // Không chặn trang nếu log lỗi
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();

    return () => {
      stopScanner();
    };
  }, []);

  const handleLookup = async (value = code) => {
    try {
      const finalCode = String(value || "").trim();

      if (!finalCode) {
        setError("Vui lòng nhập hoặc quét mã vé.");
        return;
      }

      setLookupLoading(true);
      setError("");
      setSuccess("");
      setTicketInfo(null);

      const response = await adminLookupTicketForCheckin(finalCode);

      if (!response.data?.success) {
        setError(response.data?.message || "Không tìm thấy vé");
        return;
      }

      setTicketInfo(response.data.data);
      setCode(finalCode);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tra cứu vé");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCheckin = async (method = "manual") => {
    try {
      if (!code.trim()) {
        setError("Vui lòng nhập hoặc quét mã vé.");
        return;
      }

      setCheckingIn(true);
      setError("");
      setSuccess("");

      const response = await adminCheckinTicket({
        code: code.trim(),
        checkin_method: method,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Check-in thất bại");
        return;
      }

      setSuccess("Check-in vé thành công.");
      await handleLookup(code.trim());
      await loadLogs();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi check-in vé");
      await loadLogs();
    } finally {
      setCheckingIn(false);
    }
  };

  const startScanner = async () => {
    try {
      setError("");
      setSuccess("");

      if (scannerActive) return;

      const scanner = new Html5Qrcode(scannerRegionId);
      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
        },
        async (decodedText) => {
          const scanned = String(decodedText || "").trim();

          if (!scanned) return;

          setCode(scanned);
          await stopScanner();
          await handleLookup(scanned);
        },
        () => {}
      );

      setScannerActive(true);
    } catch (err) {
      setError(
        "Không mở được camera. Hãy kiểm tra quyền camera hoặc dùng nhập mã vé thủ công."
      );
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();

        if (state === 2) {
          await scannerRef.current.stop();
        }

        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      scannerRef.current = null;
    } finally {
      setScannerActive(false);
    }
  };

  const ticket = ticketInfo?.ticket;
  const canCheckin = Boolean(ticketInfo?.can_checkin);

  return (
    <Container fluid className="admin-dashboard-page">
      <div className="admin-hero-panel admin-compact-hero">
        <div>
          <div className="admin-hero-eyebrow">Vận hành sự kiện</div>
          <h2>Check-in vé</h2>
          <p>
            Quét QR hoặc nhập mã vé để xác thực. Vé hợp lệ sẽ chuyển từ active sang used.
          </p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row className="g-4">
        <Col xl={5}>
          <Card className="admin-glass-card mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Quét hoặc nhập mã vé</h5>

              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleLookup();
                }}
              >
                <Form.Group className="mb-3">
                  <Form.Label>Mã vé / QR content</Form.Label>
                  <Form.Control
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="VD: TCK202604242342133626"
                  />
                  <Form.Text className="text-muted">
                    QR của vé đang chứa ticket_code. Có thể nhập tay nếu không dùng camera.
                  </Form.Text>
                </Form.Group>

                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    type="submit"
                    className="soft-button soft-button-primary"
                    disabled={lookupLoading}
                  >
                    {lookupLoading ? "Đang tra..." : "Tra cứu vé"}
                  </Button>

                  {!scannerActive ? (
                    <Button
                      type="button"
                      variant="outline-primary"
                      onClick={startScanner}
                    >
                      Mở camera quét QR
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline-danger"
                      onClick={stopScanner}
                    >
                      Tắt camera
                    </Button>
                  )}
                </div>
              </Form>

              <div className="admin-qr-scanner-box mt-4">
                <div id={scannerRegionId} />
              </div>
            </Card.Body>
          </Card>

          <Card className="admin-glass-card">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Lịch sử check-in gần đây</h5>

              {logsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : logs.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có lịch sử check-in.
                </Alert>
              ) : (
                <Table responsive hover className="table-modern admin-modern-table align-middle">
                  <thead>
                    <tr>
                      <th>Mã vé</th>
                      <th>Show</th>
                      <th>Kết quả</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="fw-semibold">{log.ticket_code_snapshot}</td>
                        <td>
                          <div>{log.event_title}</div>
                          <div className="text-muted small">{log.owner_name}</div>
                        </td>
                        <td>
                          <Badge bg={getStatusBadge(log.result)}>
                            {renderStatus(log.result)}
                          </Badge>
                        </td>
                        <td>{formatDateTime(log.checked_in_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={7}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Thông tin vé</h5>

              {!ticket && (
                <Alert variant="info">
                  Hãy quét QR hoặc nhập mã vé để xem thông tin check-in.
                </Alert>
              )}

              {ticket && (
                <>
                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <div className="payment-summary-box h-100">
                        <div className="fw-bold mb-2">Vé</div>
                        <div>Mã vé: {ticket.ticket_code}</div>
                        <div>Mã đơn: {ticket.order_code || "Không có"}</div>
                        <div>Loại vé: {ticket.ticket_type_name}</div>
                        <div>Giá: {formatMoney(ticket.unit_price)}</div>
                        <div className="mt-2">
                          Trạng thái:{" "}
                          <Badge bg={getStatusBadge(ticket.ticket_status)}>
                            {renderStatus(ticket.ticket_status)}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          Mint: {ticket.mint_status || "Không có"}
                        </div>
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="payment-summary-box h-100">
                        <div className="fw-bold mb-2">Chủ sở hữu</div>
                        <div>{ticket.owner_name}</div>
                        <div>{ticket.owner_email}</div>
                        <div>{ticket.owner_phone || "Không có SĐT"}</div>
                        <div className="text-break mt-2">
                          Ví: {ticket.owner_wallet_address}
                        </div>
                      </div>
                    </Col>

                    <Col md={12}>
                      <div className="payment-summary-box">
                        <div className="fw-bold mb-2">Sự kiện</div>
                        <div>{ticket.event_title}</div>
                        <div>{ticket.event_location}</div>
                        <div>{formatDateTime(ticket.event_date)}</div>
                        <div>Trạng thái sự kiện: {ticket.event_status}</div>
                      </div>
                    </Col>
                  </Row>

                  {!canCheckin && (
                    <Alert variant="warning">
                      {ticketInfo?.reason || "Vé hiện không thể check-in."}
                    </Alert>
                  )}

                  {canCheckin && (
                    <Alert variant="success">
                      Vé hợp lệ. Có thể check-in cho khách vào cổng.
                    </Alert>
                  )}

                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      className="soft-button soft-button-primary"
                      onClick={() => handleCheckin(scannerActive ? "qr" : "manual")}
                      disabled={!canCheckin || checkingIn}
                    >
                      {checkingIn ? "Đang check-in..." : "Xác nhận check-in"}
                    </Button>

                    <Button
                      variant="outline-secondary"
                      onClick={() => {
                        setCode("");
                        setTicketInfo(null);
                        setError("");
                        setSuccess("");
                      }}
                    >
                      Xóa dữ liệu
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default AdminCheckinPage;