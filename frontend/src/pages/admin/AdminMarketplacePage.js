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
  adminGetMarketplaceListings,
  adminGetMarketplaceListingDetail,
  adminApproveMarketplaceListing,
  adminRejectMarketplaceListing,
} from "../../services/marketplaceService";

function AdminMarketplacePage() {
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);

  const [status, setStatus] = useState("waiting_admin");
  const [search, setSearch] = useState("");

  const [adminNote, setAdminNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
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

  const shortenWallet = (address) => {
    if (!address) return "Không có";
    if (address.length < 14) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getStatusBadge = (value) => {
    switch (value) {
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

  const renderStatus = (value) => {
    switch (value) {
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
        return value || "Không xác định";
    }
  };

  const loadListings = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();

      const response = await adminGetMarketplaceListings(params);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được danh sách marketplace");
        return;
      }

      setListings(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [status]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadListings();
  };

  const openDetail = async (listingId) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedListing(null);
      setShowDetailModal(true);

      const response = await adminGetMarketplaceListingDetail(listingId);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được chi tiết listing");
        return;
      }

      setSelectedListing(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi lấy chi tiết listing");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (listingId) => {
    const ok = window.confirm("Xác nhận chuyển nhượng vé cho người mua?");

    if (!ok) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await adminApproveMarketplaceListing({
        listingId,
        admin_note: "Admin xác nhận giao dịch marketplace",
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể xác nhận listing");
        return;
      }

      setSuccess("Xác nhận chuyển nhượng marketplace thành công.");
      setShowToast(true);
      setShowDetailModal(false);
      setSelectedListing(null);

      await loadListings();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi xác nhận listing");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (listing) => {
    setSelectedListing(listing);
    setAdminNote("Admin từ chối giao dịch marketplace");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedListing) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await adminRejectMarketplaceListing({
        listingId: selectedListing.id,
        admin_note: adminNote,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể từ chối listing");
        return;
      }

      setSuccess("Từ chối giao dịch và hoàn tiền cho người mua thành công.");
      setShowToast(true);
      setShowRejectModal(false);
      setShowDetailModal(false);
      setSelectedListing(null);

      await loadListings();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi từ chối listing");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Container className="admin-shell">
        <div className="section-title mb-2">Quản lý sàn chuyển nhượng</div>
        <div className="section-subtitle mb-4">
          Admin xác nhận hoặc từ chối các giao dịch mua vé trên sàn.
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
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="waiting_admin">Chờ admin xác nhận</option>
                    <option value="active">Đang bán</option>
                    <option value="sold">Đã bán</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="rejected">Bị từ chối</option>
                    <option value="expired">Hết hạn</option>
                  </Form.Select>
                </Col>

                <Col md={6}>
                  <Form.Label>Tìm kiếm</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Mã listing, mã vé, tên show, người bán, người mua..."
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
            ) : listings.length === 0 ? (
              <Alert variant="info" className="mb-0">
                Không có listing nào phù hợp.
              </Alert>
            ) : (
              <Table responsive hover className="table-modern align-middle">
                <thead>
                  <tr>
                    <th>Mã listing</th>
                    <th>Vé</th>
                    <th>Người bán</th>
                    <th>Người mua</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="fw-semibold">{listing.listing_code}</td>

                      <td>
                        <div className="fw-semibold">{listing.ticket_code}</div>
                        <div className="text-muted small">{listing.event_title}</div>
                      </td>

                      <td>{listing.seller_name}</td>

                      <td>{listing.buyer_name || "Chưa có"}</td>

                      <td>{formatMoney(listing.asking_price)} VND</td>

                      <td>
                        <Badge bg={getStatusBadge(listing.status)}>
                          {renderStatus(listing.status)}
                        </Badge>
                      </td>

                      <td>
                        <div className="small">
                          Đăng: {formatDateTime(listing.listed_at)}
                        </div>
                        {listing.buyer_selected_at && (
                          <div className="small text-muted">
                            Mua: {formatDateTime(listing.buyer_selected_at)}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openDetail(listing.id)}
                          >
                            Chi tiết
                          </Button>

                          {listing.status === "waiting_admin" && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleApprove(listing.id)}
                                disabled={processing}
                              >
                                Duyệt
                              </Button>

                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => openRejectModal(listing)}
                                disabled={processing}
                              >
                                Từ chối
                              </Button>
                            </>
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
      </Container>

      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết listing</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : selectedListing ? (
            <Row className="g-3">
              <Col md={6}>
                <div className="payment-summary-box">
                  <div className="fw-bold mb-2">Thông tin vé</div>
                  <div>Mã listing: {selectedListing.listing_code}</div>
                  <div>Mã vé: {selectedListing.ticket_code}</div>
                  <div>Show: {selectedListing.event_title}</div>
                  <div>Loại vé: {selectedListing.ticket_type_name}</div>
                  <div>Ngày diễn ra: {formatDateTime(selectedListing.event_date)}</div>
                  <div>
                    Trạng thái vé:{" "}
                    <Badge bg="secondary">{selectedListing.ticket_status}</Badge>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <div className="payment-summary-box">
                  <div className="fw-bold mb-2">Giá và trạng thái</div>
                  <div>Giá gốc: {formatMoney(selectedListing.original_price)} VND</div>
                  <div>Giá bán: {formatMoney(selectedListing.asking_price)} VND</div>
                  <div>
                    Listing:{" "}
                    <Badge bg={getStatusBadge(selectedListing.status)}>
                      {renderStatus(selectedListing.status)}
                    </Badge>
                  </div>
                  <div>Transfer: {selectedListing.transfer_status || "Chưa có"}</div>
                  <div>Payment: {selectedListing.transfer_payment_status || "Chưa có"}</div>
                </div>
              </Col>

              <Col md={6}>
                <div className="payment-summary-box">
                  <div className="fw-bold mb-2">Người bán</div>
                  <div>{selectedListing.seller_name}</div>
                  <div>{selectedListing.seller_email}</div>
                  <div>Ví: {shortenWallet(selectedListing.seller_wallet_address)}</div>
                </div>
              </Col>

              <Col md={6}>
                <div className="payment-summary-box">
                  <div className="fw-bold mb-2">Người mua</div>
                  <div>{selectedListing.buyer_name || "Chưa có"}</div>
                  <div>{selectedListing.buyer_email || "Không có"}</div>
                  <div>Ví: {shortenWallet(selectedListing.buyer_wallet_address)}</div>
                </div>
              </Col>

              {selectedListing.transfer_payment && (
                <Col md={12}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Thanh toán chuyển nhượng</div>
                    <div>
                      Số tiền: {formatMoney(selectedListing.transfer_payment.amount)}{" "}
                      {selectedListing.transfer_payment.currency}
                    </div>
                    <div>
                      Phương thức:{" "}
                      {selectedListing.transfer_payment.payment_method === "demo"
                        ? "Ví nội bộ"
                        : selectedListing.transfer_payment.payment_method}
                    </div>
                    <div>Trạng thái: {selectedListing.transfer_payment.status}</div>
                    <div>Thời gian: {formatDateTime(selectedListing.transfer_payment.paid_at)}</div>
                  </div>
                </Col>
              )}
            </Row>
          ) : (
            <Alert variant="info">Không có dữ liệu.</Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          {selectedListing?.status === "waiting_admin" && (
            <>
              <Button
                variant="outline-danger"
                onClick={() => openRejectModal(selectedListing)}
                disabled={processing}
              >
                Từ chối
              </Button>

              <Button
                variant="success"
                onClick={() => handleApprove(selectedListing.id)}
                disabled={processing}
              >
                {processing ? "Đang xử lý..." : "Duyệt chuyển nhượng"}
              </Button>
            </>
          )}

          <Button
            variant="outline-secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Từ chối giao dịch</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Alert variant="warning">
            Khi từ chối, hệ thống sẽ hoàn tiền cho người mua và trả vé về trạng thái active cho người bán.
          </Alert>

          <Form.Group>
            <Form.Label>Lý do / ghi chú admin</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
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
            Thao tác marketplace đã được xử lý thành công.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default AdminMarketplacePage;