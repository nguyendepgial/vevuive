import { useEffect, useState } from "react";
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
  Modal,
  Table,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import api from "../services/api";

import {
  createMarketplaceListing,
  getMyMarketplaceListings,
  cancelMyMarketplaceListing,
} from "../services/marketplaceService";

function MyListingsPage() {
  const [tickets, setTickets] = useState([]);
  const [listings, setListings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [askingPrice, setAskingPrice] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showToast, setShowToast] = useState(false);

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getListingBadge = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "waiting_admin":
        return "warning";
      case "sold":
        return "primary";
      case "cancelled":
        return "secondary";
      case "rejected":
        return "danger";
      case "expired":
        return "dark";
      default:
        return "secondary";
    }
  };

  const renderListingStatus = (status) => {
    switch (status) {
      case "active":
        return "Đang bán";
      case "pending_payment":
        return "Chờ thanh toán";
      case "waiting_admin":
        return "Chờ admin xác nhận";
      case "sold":
        return "Đã bán";
      case "cancelled":
        return "Đã hủy";
      case "rejected":
        return "Bị từ chối";
      case "expired":
        return "Hết hạn";
      default:
        return status || "Không xác định";
    }
  };

  const loadMyTickets = async () => {
    const response = await api.get("/users/tickets");

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Không lấy được danh sách vé");
    }

    const data = Array.isArray(response.data.data) ? response.data.data : [];

    setTickets(data);
  };

  const loadMyListings = async () => {
    const response = await getMyMarketplaceListings();

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Không lấy được danh sách listing");
    }

    setListings(Array.isArray(response.data.data) ? response.data.data : []);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([loadMyTickets(), loadMyListings()]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const activeTickets = tickets.filter((ticket) => ticket.ticket_status === "active");

  const openCreateModal = (ticket) => {
    setSelectedTicket(ticket);
    setAskingPrice(ticket.unit_price || "");
    setExpiresInDays(7);
    setError("");
    setSuccess("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creating) return;

    setShowCreateModal(false);
    setSelectedTicket(null);
    setAskingPrice("");
    setExpiresInDays(7);
  };

  const handleCreateListing = async () => {
    try {
      if (!selectedTicket) return;

      setCreating(true);
      setError("");
      setSuccess("");

      const price = Number(askingPrice);
      const originalPrice = Number(selectedTicket.unit_price || 0);

      if (!price || price <= 0) {
        setError("Giá đăng bán không hợp lệ.");
        return;
      }

      if (price > originalPrice) {
        setError("Giá đăng bán không được vượt quá giá gốc của vé.");
        return;
      }

      const response = await createMarketplaceListing({
        ticket_id: selectedTicket.id,
        asking_price: price,
        expires_in_days: Number(expiresInDays || 7),
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể đăng vé lên sàn");
        return;
      }

      setSuccess("Đăng vé lên sàn thành công.");
      setShowToast(true);
      setShowCreateModal(false);
      setSelectedTicket(null);

      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi đăng vé lên sàn");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelListing = async (listingId) => {
    const ok = window.confirm("Bạn có chắc muốn hủy listing này không?");

    if (!ok) return;

    try {
      setCancellingId(listingId);
      setError("");
      setSuccess("");

      const response = await cancelMyMarketplaceListing(listingId);

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể hủy listing");
        return;
      }

      setSuccess("Hủy listing thành công.");
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi hủy listing");
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
        <div className="section-title mb-2">Vé tôi đăng bán</div>
        <div className="section-subtitle mb-4">
          Chọn vé active của bạn để đăng lên sàn chuyển nhượng. Vé đang đăng bán sẽ bị khóa tạm thời.
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Row className="g-4">
          <Col lg={5}>
            <Card className="payment-card h-100">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Vé có thể đăng bán</h5>

                {activeTickets.length === 0 ? (
                  <Alert variant="info">
                    Bạn chưa có vé active nào có thể đăng bán.
                  </Alert>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {activeTickets.map((ticket) => (
                      <div key={ticket.id} className="payment-summary-box">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <div className="fw-bold">{ticket.event_title}</div>
                            <div className="text-muted small">
                              Mã vé: {ticket.ticket_code}
                            </div>
                            <div className="text-muted small">
                              Loại vé: {ticket.ticket_type_name}
                            </div>
                            <div className="text-muted small">
                              Ngày diễn ra: {formatDateTime(ticket.event_date)}
                            </div>
                            <div className="fw-bold mt-2">
                              {formatMoney(ticket.unit_price)} VND
                            </div>
                          </div>

                          <Badge bg="success">Active</Badge>
                        </div>

                        <Button
                          className="soft-button soft-button-primary w-100 mt-3"
                          onClick={() => openCreateModal(ticket)}
                        >
                          Đăng lên sàn
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="payment-card h-100">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Listing của tôi</h5>

                {listings.length === 0 ? (
                  <Alert variant="info">
                    Bạn chưa đăng bán vé nào.
                  </Alert>
                ) : (
                  <Table responsive hover className="table-modern align-middle">
                    <thead>
                      <tr>
                        <th>Mã listing</th>
                        <th>Vé</th>
                        <th>Giá bán</th>
                        <th>Trạng thái</th>
                        <th>Người mua</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {listings.map((listing) => (
                        <tr key={listing.id}>
                          <td className="fw-semibold">{listing.listing_code}</td>

                          <td>
                            <div className="fw-semibold">{listing.event_title}</div>
                            <div className="text-muted small">
                              {listing.ticket_code}
                            </div>
                            <div className="text-muted small">
                              {listing.ticket_type_name}
                            </div>
                          </td>

                          <td>{formatMoney(listing.asking_price)} VND</td>

                          <td>
                            <Badge bg={getListingBadge(listing.status)}>
                              {renderListingStatus(listing.status)}
                            </Badge>
                          </td>

                          <td>{listing.buyer_name || "Chưa có"}</td>

                          <td className="text-end">
                            {listing.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleCancelListing(listing.id)}
                                disabled={cancellingId === listing.id}
                              >
                                {cancellingId === listing.id ? "Đang hủy..." : "Hủy"}
                              </Button>
                            )}

                            {listing.status === "waiting_admin" && (
                              <span className="text-muted small">
                                Chờ admin
                              </span>
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
      </Container>

      <Modal show={showCreateModal} onHide={closeCreateModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Đăng vé lên sàn</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedTicket && (
            <>
              <Alert variant="info">
                Giá đăng bán không được vượt quá giá gốc. Sau khi đăng bán, vé sẽ bị khóa tạm thời và không thể chuyển nhượng nơi khác.
              </Alert>

              <div className="payment-summary-box mb-3">
                <div className="fw-bold mb-2">{selectedTicket.event_title}</div>
                <div className="text-muted">
                  Mã vé: {selectedTicket.ticket_code}
                </div>
                <div className="text-muted">
                  Loại vé: {selectedTicket.ticket_type_name}
                </div>
                <div className="text-muted">
                  Giá gốc: {formatMoney(selectedTicket.unit_price)} VND
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Giá muốn bán</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={Number(selectedTicket.unit_price || 0)}
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  placeholder="Nhập giá muốn bán"
                />
                <Form.Text className="text-muted">
                  Tối đa {formatMoney(selectedTicket.unit_price)} VND
                </Form.Text>
              </Form.Group>

              <Form.Group>
                <Form.Label>Thời hạn listing</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Số ngày listing còn hiệu lực.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={closeCreateModal}
            disabled={creating}
          >
            Hủy
          </Button>

          <Button
            className="soft-button soft-button-primary"
            onClick={handleCreateListing}
            disabled={creating}
          >
            {creating ? "Đang đăng..." : "Đăng bán"}
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
            <strong className="me-auto">Đăng bán thành công</strong>
            <small>Vừa xong</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            Vé đã được đưa lên sàn chuyển nhượng.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default MyListingsPage;