import React, { useEffect, useState } from "react";
import {
  Container, Card, Button, Table, Badge, Modal, Form, Row, Col, Alert, Spinner
} from "react-bootstrap";
import { ArrowClockwise, PlusLg } from "react-bootstrap-icons";

const API_BASE = "http://localhost:5001";

const TICKET_TYPE_ENDPOINTS = {
  getByEvent: (eventId) => `${API_BASE}/api/admin/events/${eventId}/ticket-types`,
  update: (id) => `${API_BASE}/api/admin/ticket-types/${id}`,
  remove: (id) => `${API_BASE}/api/admin/ticket-types/${id}`,
  create: (eventId) => `${API_BASE}/api/admin/events/${eventId}/ticket-types`,
};

function AdminTicketTypePage() {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); 

  const [formData, setFormData] = useState({
    name: "", price: "", quantity_total: "",max_per_order: "", sale_start: "", sale_end: "", status: "active",
  });

  const token = localStorage.getItem("token");
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };


// Lấy dữ liệu từ API
  const fetchTicketTypes = async () => {
    try {
      setLoading(true);
    
    
      const eventRes = await fetch(`${API_BASE}/api/admin/events`, { headers: authHeaders });
      const eventData = await eventRes.json();
    
      if (!eventData.success) {
        setError("Không thể lấy danh sách sự kiện");
        return;
      }

      const allEvents = eventData.data; 
      let combinedTicketTypes = [];

   
      await Promise.all(allEvents.map(async (event) => {
        try {
          const ttRes = await fetch(`${API_BASE}/api/admin/events/${event.id}/ticket-types`, { 
            headers: authHeaders 
          });
          const ttData = await ttRes.json();
        
          if (ttData.success) {
          
            const typesWithEventName = ttData.data.ticket_types.map(tt => ({
             ...tt,
             event_title: event.title 
            }));
            combinedTicketTypes = [...combinedTicketTypes, ...typesWithEventName];
          }
        } catch (err) {
          console.error(`Lỗi khi lấy vé của event ${event.id}`, err);
        }
      }));

   
      setTicketTypes(combinedTicketTypes);

    } catch (err) {
      setError("Lỗi kết nối server.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { 
    fetchTicketTypes(); 
    // Tự động làm mới giao diện mỗi phút để cập nhật trạng thái thời gian thực
    const timer = setInterval(() => setRefreshKey(k => k + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTimeForInput = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };


  //Form Update Loại Vé
  const handleOpenEdit = (ticket) => {
    setEditingId(ticket.id);
    setFormData({
      event_id: ticket.event_id  || "",
      name: ticket.name || "",
      price: ticket.price || "",
      quantity_total: ticket.quantity_total || "",
      sale_start: formatDateTimeForInput(ticket.sale_start),
      sale_end: formatDateTimeForInput(ticket.sale_end),
      status: ticket.status || "active",
    });
    setShowModal(true);
  };


  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setSubmitting(false);
    setError("");
    setSuccess("");
  };



  //Update loại vé
  const handleSubmit = async (e) => {
  e.preventDefault();
  
  
  if (!editingId && !formData.event_id) {
    setError("Vui lòng nhập ID Sự kiện.");
    return;
  }

  setSubmitting(true);
  setError("");

  
  const url = editingId 
    ? `${API_BASE}/api/admin/ticket-types/${editingId}` 
    : `${API_BASE}/api/admin/events/${formData.event_id}/ticket-types`; 

  try {
    const response = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...formData,
        price: Number(formData.price),
        quantity_total: Number(formData.quantity_total),
        max_per_order: Number(formData.max_per_order || 10)
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setSuccess(editingId ? "Cập nhật thành công!" : "Thêm mới thành công!");
      
      
      fetchTicketTypes(); 

      
      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } else {
      setError(data.message || "Lỗi xử lý yêu cầu.");
    }
  } catch (err) {
    setError("Lỗi kết nối server.");
  } finally {
    setSubmitting(false);
  }
};



  
  const getAutoStatus = (saleStart, saleEnd) => {
    const now = new Date();
    const start = new Date(saleStart);
    const end = new Date(saleEnd);

    if (now < start) {
      return { label: "Sắp diễn ra", class: "bg-warning text-dark bg-opacity-10 border-warning" };
    } else if (now >= start && now <= end) {
      return { label: "Đang mở bán", class: "bg-success text-success bg-opacity-10 border-success" };
    } else {
      return { label: "Đã kết thúc", class: "bg-primary text-primary bg-opacity-10 border-primary" };
    }
  };
  

  //Tải lại trang 
  const handleRefresh = () => {
   setError("Lỗi cập nhật");
   setSuccess("Đã cập nhật lại giao diện");
   fetchTicketTypes(); 
  };


  //Thêm mới loại vé
  const handleOpenAdd = () => {
   setEditingId(null); 
   setFormData({
      name: "",
      price: "",
      quantity_total: "",
      sale_start: "",
      sale_end: "",
      status: "active", 
    });
   setError("");
   setSuccess("");
   setShowModal(true);
  };
  const handleDelete = async (id) => {
  // Hiển thị hộp thoại xác nhận trước khi xóa
    if (!window.confirm("Bạn có chắc chắn muốn xóa loại vé này? Hành động này không thể hoàn tác.")) {
     return;
    }

    try {
     setLoading(true); // Hiển thị trạng thái đang xử lý
      const response = await fetch(TICKET_TYPE_ENDPOINTS.remove(id), {
       method: "DELETE",
       headers: authHeaders,
      });

     const data = await response.json();

     if (response.ok && data.success) {
      
       alert("Xóa loại vé thành công!");
     
       fetchTicketTypes();
     } else {
       setError(data.message || "Lỗi khi xóa loại vé.");
     }
   } catch (err) {
     setError("Lỗi kết nối server khi thực hiện xóa.");
     console.error("Delete error:", err);
   } finally {
     setLoading(false);
   }
  };
  return (
    <Container fluid className="mt-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold m-0 text-dark">Quản lý loại vé</h4>
          <p className="text-muted small mb-0">Theo dõi tình trạng vé đã bán và tồn kho theo thời gian thực</p>
        </div>
          <div className="d-flex gap-2"> 
              <Button 
                variant="outline-primary" 
                className="shadow-sm border-2 fw-bold d-flex align-items-center gap-2 px-3" 
                onClick={handleRefresh}
                style={{ borderRadius: "8px" }}
                >
                <ArrowClockwise /> Tải lại
              </Button>

              <Button 
                variant="primary" 
                className="shadow-sm border-0 fw-bold px-3 d-flex align-items-center gap-2" 
                style={{ backgroundColor: "#1818bb", borderRadius: "8px" }}
                onClick={handleOpenAdd}
                >
                <PlusLg /> Thêm loại vé
              </Button>
          </div>
      </div>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Table hover responsive className="align-middle mb-0">
          <thead className="table-light text-secondary">
            <tr style={{ fontSize: "14px" }}>
              <th className="ps-4 py-3">ID</th>
              <th>Loại vé / Sự kiện</th>
              <th>Giá (VND)</th>
              <th>Đã bán / Tổng</th>
              <th>Còn lại</th>
              <th>Trạng thái</th>
              <th className="text-center pe-4">Thao tác</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: "none" }}>
            {ticketTypes.map((tt) => {
              const remaining = tt.quantity_total - (tt.quantity_sold || 0);
              const statusInfo = getAutoStatus(tt.sale_start, tt.sale_end);

              return (
                <tr key={tt.id}>
                  <td className="ps-4 text-muted fw-bold">{tt.id}</td>
                  <td>
                    <div className="fw-bold text-dark">{tt.name}</div>
                    <div className="small text-muted text-truncate" style={{ maxWidth: "250px" }}>{tt.event_title}</div>
                  </td>
                  <td className="fw-bold text-primary">
                    {Number(tt.price).toLocaleString()} đ
                  </td>
                  <td>
                    <span className="text-danger fw-bold">{tt.quantity_sold || 0}</span> / {tt.quantity_total}
                  </td>
                  <td>
                    <Badge bg={remaining <= 0 ? "secondary" : "success"} pill className="px-3 py-2">
                      {remaining} vé
                    </Badge>
                  </td>
                  <td>
                    <Badge 
                      bg="none" 
                      className={`border border-opacity-25 px-2 py-1 ${statusInfo.class}`}
                      style={{ fontWeight: "600", fontSize: "12px" }}
                    >
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className="text-center pe-4">
                    <div className="d-flex flex-column align-items-center gap-1">
                     
                     {/*Sua */}
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        style={{ width: "70px", fontSize: "12px", borderRadius: "6px" }} 
                        onClick={() => handleOpenEdit(tt)}
                      >
                        Sửa
                      </Button>
                      
                      {/*Xoa */}
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        style={{ width: "70px", fontSize: "12px", borderRadius: "6px" }}
                        onClick={() => handleDelete(tt.id)}
                      >
                        Xóa
                      </Button>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Modal Cập Nhật */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg" className="rounded-4">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="border-0 px-4 pt-4">
            <Modal.Title className="fw-bold">Cập nhật thông tin loại vé</Modal.Title>
          </Modal.Header>
          <Modal.Body className="px-4">
            {error && <Alert variant="danger" className="py-2 border-0 shadow-sm">{error}</Alert>}
            {success && <Alert variant="success" className="py-2 border-0 shadow-sm">{success}</Alert>}
            {!editingId && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-secondary">ID Sự kiện</Form.Label>
                 <Form.Control 
                   type="number"
                   placeholder="Nhập ID sự kiện (Ví dụ: 1)"
                   value={formData.event_id || ""}
                   onChange={(e) => setFormData({...formData, event_id: e.target.value})}
                   required
                   className="py-2 border-2 border-primary border-opacity-25"
                />
                  <Form.Text className="text-muted small">
                     * Bắt buộc phải nhập ID sự kiện để hệ thống biết vé này thuộc về liveshow nào.
                  </Form.Text>
              </Form.Group>
            )}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label className="fw-bold text-secondary">Tên loại vé</Form.Label>
                <Form.Control 
                  className="py-2 border-2"
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </Col>
              <Col md={6}>
                <Form.Label className="fw-bold text-secondary">Giá vé (VND)</Form.Label>
                <Form.Control 
                  className="py-2 border-2"
                  type="number" 
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  required 
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-secondary">Tổng số lượng phát hành</Form.Label>
              <Form.Control 
                className="py-2 border-2"
                type="number"
                value={formData.quantity_total}
                onChange={(e) => setFormData({...formData, quantity_total: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-secondary">Số lượng vé tối đa mỗi đơn</Form.Label>
              <Form.Control 
                className="py-2 border-2"
                type="number"
                value={formData.max_per_order}
                onChange={(e) => setFormData({...formData, max_per_order: e.target.value})}
                required
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label className="fw-bold text-secondary">Ngày bắt đầu bán</Form.Label>
                <Form.Control 
                  className="py-2 border-2"
                  type="datetime-local" 
                  value={formData.sale_start} 
                  onChange={(e) => setFormData({...formData, sale_start: e.target.value})} 
                  required 
                />
              </Col>
              <Col md={6}>
                <Form.Label className="fw-bold text-secondary">Ngày kết thúc bán</Form.Label>
                <Form.Control 
                  className="py-2 border-2"
                  type="datetime-local" 
                  value={formData.sale_end} 
                  onChange={(e) => setFormData({...formData, sale_end: e.target.value})} 
                  required 
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-secondary">Trạng thái ghi đè (Nếu cần)</Form.Label>
              <Form.Select 
                className="py-2 border-2"
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="active">Đang mở bán</option>
                <option value="paused">Tạm dừng bán (Paused)</option>
                <option value="sold_out">Hết vé (Sold Out)</option>
              </Form.Select>
              <Form.Text className="text-muted small">
                * Trạng thái ngoài danh sách sẽ được hệ thống tự tính toán theo thời gian.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pb-4 px-4 gap-2">
            <Button variant="light" className="px-4 py-2 fw-bold text-secondary" onClick={handleCloseModal}>
              Hủy bỏ
            </Button>
            <Button 
              type="submit" 
              disabled={submitting} 
              className="px-4 py-2 fw-bold shadow-sm"
              style={{ backgroundColor: "#4e46e5", borderColor: "#4e46e5" }}
            >
              {submitting ? <Spinner size="sm" animation="border" /> : "Cập nhật loại vé"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default AdminTicketTypePage;