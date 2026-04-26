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
  Tabs,
  Tab,
} from "react-bootstrap";

import {
  adminGetTickets,
  adminGetTicketDetail,
  adminUpdateTicketStatus,
} from "../../services/adminTicketManageService";

function AdminTicketManagePage() {
  const [tickets, setTickets] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [search, setSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  const [mintStatus, setMintStatus] = useState("");

  const [editTicketStatus, setEditTicketStatus] = useState("");
  const [editMintStatus, setEditMintStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const shortenText = (value, start = 10, end = 8) => {
    if (!value) return "Không có";
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
      case "minted":
      case "completed":
      case "paid":
      case "sold":
        return "success";

      case "pending":
      case "transfer_pending":
      case "waiting_admin":
      case "paid_submitted":
        return "warning";

      case "used":
        return "primary";

      case "cancelled":
      case "failed":
      case "rejected":
      case "expired":
        return "danger";

      default:
        return "secondary";
    }
  };

  const renderStatus = (status) => {
    const map = {
      active: "Active",
      used: "Đã sử dụng",
      cancelled: "Đã hủy",
      transfer_pending: "Đang khóa chuyển nhượng",
      pending: "Chờ xử lý",
      minted: "Đã mint",
      failed: "Thất bại",
      completed: "Hoàn tất",
      paid: "Đã thanh toán",
      sold: "Đã bán",
      waiting_admin: "Chờ admin",
      paid_submitted: "Đã báo thanh toán",
      rejected: "Bị từ chối",
      expired: "Hết hạn",
    };

    return map[status] || status || "Không xác định";
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: 1,
        limit: 30,
      };

      if (search.trim()) params.search = search.trim();
      if (ticketStatus) params.ticket_status = ticketStatus;
      if (mintStatus) params.mint_status = mintStatus;

      const response = await adminGetTickets(params);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được danh sách vé");
        return;
      }

      setTickets(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải danh sách vé");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [ticketStatus, mintStatus]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadTickets();
  };

  const openDetail = async (ticketId) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedDetail(null);
      setShowDetailModal(true);

      const response = await adminGetTicketDetail(ticketId);

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được chi tiết vé");
        return;
      }

      setSelectedDetail(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi lấy chi tiết vé");
    } finally {
      setDetailLoading(false);
    }
  };

  const openStatusModal = (ticket) => {
    setSelectedDetail({
      ticket,
      payments: [],
      transfers: [],
      listings: [],
    });

    setEditTicketStatus(ticket.ticket_status || "");
    setEditMintStatus(ticket.mint_status || "");
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedDetail?.ticket) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await adminUpdateTicketStatus({
        ticketId: selectedDetail.ticket.id,
        ticket_status: editTicketStatus,
        mint_status: editMintStatus,
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể cập nhật trạng thái vé");
        return;
      }

      setSuccess("Cập nhật trạng thái vé thành công.");
      setShowStatusModal(false);
      await loadTickets();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật trạng thái vé");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Container fluid className="admin-dashboard-page">
        <div className="admin-hero-panel admin-compact-hero">
          <div>
            <div className="admin-hero-eyebrow">Quản lý nghiệp vụ</div>
            <h2>Quản lý vé</h2>
            <p>
              Theo dõi vé đã phát hành, chủ sở hữu, ví nhận vé, trạng thái sử dụng, mint NFT và chuyển nhượng.
            </p>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="admin-glass-card mb-4">
          <Card.Body className="p-4">
            <Form onSubmit={handleSearchSubmit}>
              <Row className="g-3">
                <Col lg={6}>
                  <Form.Label>Tìm kiếm</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Mã vé, show, loại vé, chủ sở hữu, email, ví, mã đơn..."
                  />
                </Col>

                <Col lg={3}>
                  <Form.Label>Trạng thái vé</Form.Label>
                  <Form.Select
                    value={ticketStatus}
                    onChange={(event) => setTicketStatus(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="active">Active</option>
                    <option value="used">Đã sử dụng</option>
                    <option value="transfer_pending">Đang khóa chuyển nhượng</option>
                    <option value="cancelled">Đã hủy</option>
                  </Form.Select>
                </Col>

                <Col lg={2}>
                  <Form.Label>Mint</Form.Label>
                  <Form.Select
                    value={mintStatus}
                    onChange={(event) => setMintStatus(event.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="pending">Pending</option>
                    <option value="minted">Minted</option>
                    <option value="failed">Failed</option>
                  </Form.Select>
                </Col>

                <Col lg={1} className="d-flex align-items-end">
                  <Button type="submit" className="soft-button soft-button-primary w-100">
                    Lọc
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="admin-glass-card">
          <Card.Body className="p-4">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : tickets.length === 0 ? (
              <Alert variant="info" className="mb-0">
                Không có vé nào phù hợp.
              </Alert>
            ) : (
              <Table responsive hover className="table-modern admin-modern-table align-middle">
                <thead>
                  <tr>
                    <th>Mã vé</th>
                    <th>Show</th>
                    <th>Chủ sở hữu</th>
                    <th>Ví owner</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                    <th>Mint</th>
                    <th>Chuyển nhượng</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <div className="fw-semibold">{ticket.ticket_code}</div>
                        <div className="text-muted small">{ticket.order_code}</div>
                      </td>

                      <td>
                        <div className="fw-semibold">{ticket.event_title}</div>
                        <div className="text-muted small">{ticket.ticket_type_name}</div>
                        <div className="text-muted small">{formatDateTime(ticket.event_date)}</div>
                      </td>

                      <td>
                        <div className="fw-semibold">{ticket.owner_name}</div>
                        <div className="text-muted small">{ticket.owner_email}</div>
                      </td>

                      <td className="text-break">
                        {shortenText(ticket.owner_wallet_address, 8, 8)}
                      </td>

                      <td>{formatMoney(ticket.unit_price)}</td>

                      <td>
                        <Badge bg={getStatusBadge(ticket.ticket_status)}>
                          {renderStatus(ticket.ticket_status)}
                        </Badge>
                      </td>

                      <td>
                        <Badge bg={getStatusBadge(ticket.mint_status)}>
                          {renderStatus(ticket.mint_status)}
                        </Badge>
                      </td>

                      <td>
                        <div>{ticket.transferred_count} lần</div>
                        {ticket.last_transfer_at && (
                          <div className="text-muted small">
                            {formatDateTime(ticket.last_transfer_at)}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openDetail(ticket.id)}
                          >
                            Chi tiết
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => openStatusModal(ticket)}
                          >
                            Trạng thái
                          </Button>
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
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết vé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : selectedDetail ? (
            <>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Thông tin vé</div>
                    <div>Mã vé: {selectedDetail.ticket.ticket_code}</div>
                    <div>Mã đơn: {selectedDetail.ticket.order_code || "Không có"}</div>
                    <div>Loại vé: {selectedDetail.ticket.ticket_type_name}</div>
                    <div>Giá vé: {formatMoney(selectedDetail.ticket.unit_price)}</div>
                    <div>
                      Trạng thái:{" "}
                      <Badge bg={getStatusBadge(selectedDetail.ticket.ticket_status)}>
                        {renderStatus(selectedDetail.ticket.ticket_status)}
                      </Badge>
                    </div>
                    <div>
                      Mint:{" "}
                      <Badge bg={getStatusBadge(selectedDetail.ticket.mint_status)}>
                        {renderStatus(selectedDetail.ticket.mint_status)}
                      </Badge>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Chủ sở hữu</div>
                    <div>{selectedDetail.ticket.owner_name}</div>
                    <div>{selectedDetail.ticket.owner_email}</div>
                    <div>{selectedDetail.ticket.owner_phone || "Không có SĐT"}</div>
                    <div className="text-break">
                      Ví: {selectedDetail.ticket.owner_wallet_address}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Sự kiện</div>
                    <div>{selectedDetail.ticket.event_title}</div>
                    <div>{selectedDetail.ticket.event_location}</div>
                    <div>{formatDateTime(selectedDetail.ticket.event_date)}</div>
                    <div>Trạng thái event: {selectedDetail.ticket.event_status}</div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="payment-summary-box">
                    <div className="fw-bold mb-2">Blockchain/NFT</div>
                    <div>Token ID: {selectedDetail.ticket.blockchain_ticket_id || "Chưa có"}</div>
                    <div className="text-break">
                      Contract: {selectedDetail.ticket.contract_address || "Chưa có"}
                    </div>
                    <div className="text-break">
                      Mint tx: {selectedDetail.ticket.mint_tx_hash || "Chưa có"}
                    </div>
                    <div className="text-break">
                      Metadata: {selectedDetail.ticket.metadata_uri || "Chưa có"}
                    </div>
                  </div>
                </Col>
              </Row>

              <Tabs defaultActiveKey="transfers" className="mb-3">
                <Tab eventKey="transfers" title="Lịch sử chuyển nhượng">
                  {selectedDetail.transfers.length === 0 ? (
                    <Alert variant="info">Vé chưa có lịch sử chuyển nhượng.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Từ</th>
                          <th>Đến</th>
                          <th>Loại</th>
                          <th>Giá</th>
                          <th>Thanh toán</th>
                          <th>Trạng thái</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.transfers.map((transfer) => (
                          <tr key={transfer.id}>
                            <td>
                              <div className="fw-semibold">{transfer.from_user_name}</div>
                              <div className="text-muted small">{transfer.from_user_email}</div>
                            </td>
                            <td>
                              <div className="fw-semibold">{transfer.to_user_name}</div>
                              <div className="text-muted small">{transfer.to_user_email}</div>
                            </td>
                            <td>{transfer.transfer_type}</td>
                            <td>{formatMoney(transfer.asking_price)}</td>
                            <td>
                              <Badge bg={getStatusBadge(transfer.payment_status)}>
                                {renderStatus(transfer.payment_status)}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={getStatusBadge(transfer.status)}>
                                {renderStatus(transfer.status)}
                              </Badge>
                            </td>
                            <td>{formatDateTime(transfer.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                <Tab eventKey="listings" title="Sàn chuyển nhượng">
                  {selectedDetail.listings.length === 0 ? (
                    <Alert variant="info">Vé chưa từng được đăng lên sàn.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Listing</th>
                          <th>Người bán</th>
                          <th>Người mua</th>
                          <th>Giá bán</th>
                          <th>Trạng thái</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.listings.map((listing) => (
                          <tr key={listing.id}>
                            <td className="fw-semibold">{listing.listing_code}</td>
                            <td>{listing.seller_name}</td>
                            <td>{listing.buyer_name || "Chưa có"}</td>
                            <td>{formatMoney(listing.asking_price)}</td>
                            <td>
                              <Badge bg={getStatusBadge(listing.status)}>
                                {renderStatus(listing.status)}
                              </Badge>
                            </td>
                            <td>{formatDateTime(listing.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                <Tab eventKey="payments" title="Payment đơn gốc">
                  {selectedDetail.payments.length === 0 ? (
                    <Alert variant="info">Không có payment gốc.</Alert>
                  ) : (
                    <Table responsive hover className="table-modern admin-modern-table align-middle">
                      <thead>
                        <tr>
                          <th>Mã payment</th>
                          <th>Phương thức</th>
                          <th>Số tiền</th>
                          <th>Ví trả</th>
                          <th>Trạng thái</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="fw-semibold">{payment.payment_code}</td>
                            <td>{payment.payment_method === "demo" ? "Ví nội bộ" : payment.payment_method}</td>
                            <td>{formatMoney(payment.amount)}</td>
                            <td className="text-break">{payment.payer_wallet_address || "Không có"}</td>
                            <td>
                              <Badge bg={getStatusBadge(payment.status)}>
                                {renderStatus(payment.status)}
                              </Badge>
                            </td>
                            <td>{formatDateTime(payment.paid_at || payment.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>
              </Tabs>
            </>
          ) : (
            <Alert variant="info">Không có dữ liệu.</Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showStatusModal}
        onHide={() => setShowStatusModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Cập nhật trạng thái vé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedDetail?.ticket && (
            <Alert variant="info">
              Vé: <strong>{selectedDetail.ticket.ticket_code}</strong>
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Trạng thái vé</Form.Label>
            <Form.Select
              value={editTicketStatus}
              onChange={(event) => setEditTicketStatus(event.target.value)}
            >
              <option value="">Không đổi</option>
              <option value="active">Active</option>
              <option value="used">Đã sử dụng</option>
              <option value="transfer_pending">Đang khóa chuyển nhượng</option>
              <option value="cancelled">Đã hủy</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Trạng thái mint</Form.Label>
            <Form.Select
              value={editMintStatus}
              onChange={(event) => setEditMintStatus(event.target.value)}
            >
              <option value="">Không đổi</option>
              <option value="pending">Pending</option>
              <option value="minted">Minted</option>
              <option value="failed">Failed</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowStatusModal(false)}
            disabled={saving}
          >
            Hủy
          </Button>

          <Button
            className="soft-button soft-button-primary"
            onClick={handleSaveStatus}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu trạng thái"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminTicketManagePage;