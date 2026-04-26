import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import api from "../services/api";
import { getUserFromLocalStorage } from "../services/authService";
import { createOrder } from "../services/orderService";

function EventDetailPage() {
  const params = useParams();
  const id = params.id || params.eventId;

  const navigate = useNavigate();
  const ticketSectionRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = getUserFromLocalStorage();

  const getBannerSrc = (bannerImage) => {
    if (!bannerImage) {
      return "https://via.placeholder.com/1200x700?text=Concert+Banner";
    }

    if (bannerImage.startsWith("http://") || bannerImage.startsWith("https://")) {
      return bannerImage;
    }

    return `/images/${bannerImage}`;
  };

  const getEventStatusText = (status) => {
    switch (status) {
      case "upcoming":
        return "Sắp mở bán";
      case "on_sale":
        return "Đang mở bán";
      case "sold_out":
        return "Hết vé";
      default:
        return status || "Không xác định";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Không có dữ liệu";

    return new Date(dateString).toLocaleString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        setError("");

        if (!id) {
          setError("ID sự kiện không hợp lệ");
          setLoading(false);
          return;
        }

        const response = await api.get(`/users/events/${id}`);
        const payload = response.data?.data;

        if (response.data?.success && payload) {
          setEvent(payload);
          const tickets = Array.isArray(payload.ticket_types) ? payload.ticket_types : [];
          setTicketTypes(tickets);

          const initialQuantities = {};
          tickets.forEach((ticket) => {
            initialQuantities[ticket.id] = 0;
          });
          setQuantities(initialQuantities);
        } else {
          setError("Không lấy được chi tiết sự kiện");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Lỗi khi tải chi tiết sự kiện");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetail();
  }, [id]);

  const handleQuantityChange = (ticket, value) => {
    let quantity = Number(value);

    if (Number.isNaN(quantity) || quantity < 0) quantity = 0;

    const maxAllowed = Math.min(
      Number(ticket.quantity_available || 0),
      Number(ticket.max_per_order || 0)
    );

    if (quantity > maxAllowed) quantity = maxAllowed;

    setQuantities((prev) => ({
      ...prev,
      [ticket.id]: quantity,
    }));
  };

  const totalTickets = useMemo(() => {
    return ticketTypes.reduce((sum, ticket) => sum + Number(quantities[ticket.id] || 0), 0);
  }, [ticketTypes, quantities]);

  const totalAmount = useMemo(() => {
    return ticketTypes.reduce((sum, ticket) => {
      const qty = Number(quantities[ticket.id] || 0);
      return sum + qty * Number(ticket.price || 0);
    }, 0);
  }, [ticketTypes, quantities]);

  const minPrice = useMemo(() => {
    if (!ticketTypes.length) return 0;
    return Math.min(...ticketTypes.map((ticket) => Number(ticket.price || 0)));
  }, [ticketTypes]);

  const canBuy = ticketTypes.some(
    (ticket) =>
      Number(ticket.quantity_available || 0) > 0 &&
      Number(ticket.max_per_order || 0) > 0 &&
      ticket.status === "active"
  );

  const scrollToTickets = () => {
    if (ticketSectionRef.current) {
      ticketSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCreateOrder = async () => {
    try {
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");
      if (!token || !user) {
        navigate("/login");
        return;
      }

      const items = ticketTypes
        .filter((ticket) => Number(quantities[ticket.id] || 0) > 0)
        .map((ticket) => ({
          ticket_type_id: ticket.id,
          quantity: Number(quantities[ticket.id]),
        }));

      if (items.length === 0) {
        setError("Vui lòng chọn ít nhất 1 vé");
        scrollToTickets();
        return;
      }

      setSubmitting(true);

      const response = await createOrder({
        items,
        payment_method: "demo",
      });

      if (response.data?.success) {
        const orderId = response.data.data?.id;
        setSuccess("Tạo đơn hàng thành công, đang chuyển sang trang thanh toán...");

        setTimeout(() => {
          navigate(`/payment/${orderId}`);
        }, 700);
      } else {
        setError(response.data?.message || "Đặt vé thất bại");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi đặt vé");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center tb-detail-loading">
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <Container className="tb-detail-page py-5 text-center text-white">
        <h3>{error}</h3>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container className="tb-detail-page py-5 text-center text-white">
        <h3>Không tìm thấy sự kiện này.</h3>
      </Container>
    );
  }

  return (
    <div className="tb-detail-page">
      <Container fluid="xl" className="tb-detail-container">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <section className="tb-detail-hero">
          <Row className="g-0">
            <Col lg={5}>
              <div className="h-100">
                <img
                  src={getBannerSrc(event.banner_image)}
                  alt={event.title}
                  className="w-100 h-100"
                  style={{ objectFit: "cover", minHeight: 320, borderRadius: 24 }}
                />
              </div>
            </Col>

            <Col lg={7}>
              <div className="tb-detail-info-panel h-100">
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                  <div className="tb-detail-title">{event.title}</div>
                  <Badge bg="light" text="dark" pill>
                    {getEventStatusText(event.status)}
                  </Badge>
                </div>

                <div className="tb-detail-meta-item">
                  <span className="tb-detail-icon">🗓</span>
                  <div>
                    <div className="tb-detail-meta-highlight">{formatDateTime(event.event_date)}</div>
                    <div className="text-muted">Thời gian diễn ra</div>
                  </div>
                </div>

                <div className="tb-detail-meta-item">
                  <span className="tb-detail-icon">📍</span>
                  <div>
                    <div className="tb-detail-meta-highlight">{event.location || "Đang cập nhật"}</div>
                    <div className="text-muted">Địa điểm tổ chức</div>
                  </div>
                </div>

                <div className="tb-detail-meta-item">
                  <span className="tb-detail-icon">🎤</span>
                  <div>
                    <div className="tb-detail-meta-highlight">
                      {event.organizer_name || "Ban tổ chức đang cập nhật"}
                    </div>
                    <div className="text-muted">Đơn vị tổ chức</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 fw-semibold">Mô tả sự kiện</div>
                  <div className="text-muted">{event.description || "Chưa có mô tả cho sự kiện này."}</div>
                </div>

                <div className="d-flex flex-wrap gap-3 mt-4">
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <div className="text-muted small">Từ</div>
                      <div className="fw-bold fs-5">{Number(minPrice).toLocaleString("vi-VN")} VND</div>
                    </Card.Body>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <div className="text-muted small">Loại vé</div>
                      <div className="fw-bold fs-5">{ticketTypes.length}</div>
                    </Card.Body>
                  </Card>
                </div>

                <div className="d-flex gap-3 flex-wrap mt-4">
                  <Button className="soft-button soft-button-primary" onClick={scrollToTickets}>
                    Chọn vé ngay
                  </Button>
                  <Button className="soft-button soft-button-outline" onClick={() => navigate("/home")}>
                    Quay lại
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </section>

        <section className="mt-4" ref={ticketSectionRef}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4 p-lg-5">
              <div className="section-title mb-2">Chọn loại vé</div>
              <div className="section-subtitle mb-4">
                Hệ thống backend chỉ cho tạo đơn khi tài khoản đã liên kết ví. Nếu chưa liên kết ví, backend sẽ báo lỗi đúng nghiệp vụ.
              </div>

              {!ticketTypes.length ? (
                <Alert variant="warning" className="mb-0">
                  Hiện chưa có loại vé nào đang mở bán cho sự kiện này.
                </Alert>
              ) : (
                <>
                  <div className="d-flex flex-column gap-3">
                    {ticketTypes.map((ticket) => {
                      const available = Number(ticket.quantity_available || 0);
                      const maxPerOrder = Number(ticket.max_per_order || 0);
                      const isDisabled = available <= 0 || maxPerOrder <= 0 || ticket.status !== "active";

                      return (
                        <Card key={ticket.id} className="border rounded-4">
                          <Card.Body>
                            <Row className="align-items-center g-3">
                              <Col lg={6}>
                                <div className="fw-bold fs-5 mb-1">{ticket.name}</div>
                                <div className="text-muted mb-2">{ticket.description || "Không có mô tả"}</div>
                                <div className="d-flex gap-3 flex-wrap small text-muted">
                                  <span>Còn lại: {available}</span>
                                  <span>Giới hạn/đơn: {maxPerOrder}</span>
                                </div>
                              </Col>

                              <Col lg={3}>
                                <div className="fw-bold fs-5 text-primary">
                                  {Number(ticket.price).toLocaleString("vi-VN")} VND
                                </div>
                              </Col>

                              <Col lg={3}>
                                <Form.Control
                                  type="number"
                                  min={0}
                                  max={Math.min(available, maxPerOrder)}
                                  value={quantities[ticket.id] || 0}
                                  onChange={(e) => handleQuantityChange(ticket, e.target.value)}
                                  disabled={isDisabled}
                                />
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>

                  <Row className="mt-4 g-3 align-items-center">
                    <Col md={8}>
                      <div className="payment-summary-box">
                        <div className="fw-bold mb-1">Tóm tắt đơn hàng</div>
                        <div className="text-muted">Tổng vé: {totalTickets}</div>
                        <div className="text-muted">
                          Tổng tiền: {Number(totalAmount).toLocaleString("vi-VN")} VND
                        </div>
                      </div>
                    </Col>
                    <Col md={4} className="text-md-end">
                      <Button
                        className="soft-button soft-button-primary w-100"
                        onClick={handleCreateOrder}
                        disabled={!canBuy || submitting}
                      >
                        {submitting ? "Đang tạo đơn..." : "Tạo đơn hàng"}
                      </Button>
                    </Col>
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>
        </section>
      </Container>
    </div>
  );
}

export default EventDetailPage;