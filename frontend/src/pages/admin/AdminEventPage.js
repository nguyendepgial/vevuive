import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/admin-main.css";

const initialForm = {
  title: "",
  slug: "",
  description: "",
  location: "",
  event_date: "",
  banner_image: "",
  organizer_name: "",
  status: "draft",
};

function AdminEventPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/events", {
        params: { limit: 100 },
      });

      setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingEvent(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const formatForDatetimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      slug: event.slug || "",
      description: event.description || "",
      location: event.location || "",
      event_date: formatForDatetimeLocal(event.event_date),
      banner_image: event.banner_image || "",
      organizer_name: event.organizer_name || "",
      status: event.status || "draft",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      title: formData.title.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      event_date: formData.event_date,
      banner_image: formData.banner_image.trim(),
      organizer_name: formData.organizer_name.trim(),
      status: formData.status,
    };

    try {
      if (editingEvent) {
        await api.put(`/admin/events/${editingEvent.id}`, payload);
        setSuccess("Cập nhật sự kiện thành công!");
      } else {
        await api.post("/admin/events", payload);
        setSuccess("Tạo sự kiện thành công!");
      }

      handleCloseModal();
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu sự kiện.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa sự kiện này không?");
    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/admin/events/${id}`);

      setSuccess("Xóa sự kiện thành công!");
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa sự kiện.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "on_sale":
        return "success";
      case "upcoming":
        return "warning";
      case "draft":
        return "secondary";
      case "sold_out":
        return "danger";
      case "ended":
        return "primary";
      case "cancelled":
        return "dark";
      default:
        return "secondary";
    }
  };

  const renderStatusText = (status) => {
    switch (status) {
      case "draft":
        return "Bản nháp";
      case "upcoming":
        return "Sắp diễn ra";
      case "on_sale":
        return "Đang mở bán";
      case "sold_out":
        return "Hết vé";
      case "ended":
        return "Đã kết thúc";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h2 className="admin-page-title">Quản lý sự kiện</h2>
          <p className="admin-page-subtitle">
            Tạo, cập nhật và quản lý toàn bộ sự kiện trong hệ thống
          </p>
        </div>

        <div className="admin-topbar-actions">
          <Button as={Link} to="/admin" variant="outline-dark">
            Quay lại Dashboard
          </Button>
          <Button className="admin-primary-btn" onClick={handleOpenCreate}>
            + Thêm sự kiện
          </Button>
        </div>
      </div>

      <Container fluid className="p-0">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="admin-card">
          <Card.Body>
            <div className="admin-card-header">
              <div>
                <h5 className="mb-1">Danh sách sự kiện</h5>
                <p className="text-muted mb-0">Tổng số: {events.length} sự kiện</p>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading-box">
                <Spinner animation="border" />
                <p className="mt-3 mb-0">Đang tải dữ liệu sự kiện...</p>
              </div>
            ) : (
              <div className="table-responsive mt-3">
                <Table hover className="admin-table align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên sự kiện</th>
                      <th>Địa điểm</th>
                      <th>Ngày diễn ra</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length > 0 ? (
                      events.map((event) => (
                        <tr key={event.id}>
                          <td>{event.id}</td>
                          <td>
                            <div className="fw-semibold">{event.title}</div>
                            <small className="text-muted">slug: {event.slug || "(tự tạo)"}</small>
                          </td>
                          <td>{event.location}</td>
                          <td>
                            {event.event_date
                              ? new Date(event.event_date).toLocaleString("vi-VN")
                              : "—"}
                          </td>
                          <td>
                            <Badge bg={getStatusBadge(event.status)}>
                              {renderStatusText(event.status)}
                            </Badge>
                          </td>
                          <td>
                            <div className="admin-action-group">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleOpenEdit(event)}
                              >
                                Sửa
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(event.id)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          Chưa có sự kiện nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingEvent ? "Cập nhật sự kiện" : "Thêm sự kiện mới"}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên sự kiện</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Nhập tên sự kiện"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Slug</Form.Label>
                  <Form.Control
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="Có thể để trống để backend tự tạo"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Địa điểm</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Nhập địa điểm"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ban tổ chức</Form.Label>
                  <Form.Control
                    type="text"
                    name="organizer_name"
                    value={formData.organizer_name}
                    onChange={handleChange}
                    placeholder="Nhập tên ban tổ chức"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Nhập mô tả sự kiện"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ngày diễn ra</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="draft">Bản nháp</option>
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="on_sale">Đang mở bán</option>
                    <option value="sold_out">Hết vé</option>
                    <option value="ended">Đã kết thúc</option>
                    <option value="cancelled">Đã hủy</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Banner image</Form.Label>
              <Form.Control
                type="text"
                name="banner_image"
                value={formData.banner_image}
                onChange={handleChange}
                placeholder="Nhập URL ảnh banner"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button type="submit" className="admin-primary-btn" disabled={submitting}>
              {submitting ? "Đang lưu..." : editingEvent ? "Cập nhật" : "Tạo mới"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

export default AdminEventPage;