import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  CalendarEvent,
  TicketPerforatedFill,
  CashCoin,
  PeopleFill,
  Wallet2,
  Shop,
  ArrowRight,
  Activity,
  ClockHistory,
  CheckCircleFill,
  ExclamationTriangleFill,
  GraphUpArrow,
} from "react-bootstrap-icons";

import { getAdminDashboard } from "../../services/adminDashboardService";

function AdminDashboardPage() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatMoneyShort = (value) => {
    const number = Number(value || 0);

    if (number >= 1000000000) return `${(number / 1000000000).toFixed(1)} tỷ`;
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)} triệu`;
    if (number >= 1000) return `${(number / 1000).toFixed(0)}K`;

    return number.toLocaleString("vi-VN");
  };

  const formatMoneyFull = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
      case "paid":
      case "success":
      case "approved":
      case "sold":
      case "on_sale":
      case "active":
        return "success";

      case "pending":
      case "awaiting_payment":
      case "paid_submitted":
      case "waiting_admin":
        return "warning";

      case "cancelled":
      case "rejected":
      case "failed":
      case "expired":
        return "danger";

      case "transfer_pending":
        return "info";

      default:
        return "secondary";
    }
  };

  const renderStatus = (status) => {
    const map = {
      on_sale: "Đang mở bán",
      draft: "Bản nháp",
      cancelled: "Đã hủy",
      completed: "Hoàn tất",
      awaiting_payment: "Chờ thanh toán",
      pending: "Chờ xử lý",
      paid: "Đã thanh toán",
      success: "Thành công",
      paid_submitted: "User đã báo thanh toán",
      approved: "Đã duyệt",
      rejected: "Bị từ chối",
      waiting_admin: "Chờ admin",
      sold: "Đã bán",
      active: "Đang hoạt động",
      used: "Đã sử dụng",
      transfer_pending: "Đang khóa chuyển nhượng",
      expired: "Hết hạn",
    };

    return map[status] || status || "Không xác định";
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminDashboard();

      if (!response.data?.success) {
        setError(response.data?.message || "Không lấy được dashboard");
        return;
      }

      setDashboard(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải dashboard admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = dashboard?.stats || {};
  const revenue7Days = dashboard?.revenue_last_7_days || [];
  const ticketTypes = dashboard?.ticket_type_performance || [];
  const topEvents = dashboard?.top_events || [];
  const recentOrders = dashboard?.recent_orders || [];
  const recentTopups = dashboard?.recent_topups || [];
  const recentMarketplace = dashboard?.recent_marketplace || [];
  const upcomingEvents = dashboard?.upcoming_events || [];

  const maxRevenue = useMemo(() => {
    const values = revenue7Days.map((item) => Number(item.value || 0));
    return Math.max(...values, 1);
  }, [revenue7Days]);

  const systemHealth = useMemo(() => {
    const pendingTopup = Number(stats.submitted_topup_requests || 0);
    const pendingMarketplace = Number(stats.waiting_admin_marketplace_listings || 0);
    const awaitingOrders = Number(stats.awaiting_payment_orders || 0);

    if (pendingTopup + pendingMarketplace >= 5) {
      return {
        label: "Cần xử lý nhiều",
        tone: "danger",
        icon: <ExclamationTriangleFill />,
      };
    }

    if (pendingTopup + pendingMarketplace + awaitingOrders > 0) {
      return {
        label: "Ổn định, có việc chờ",
        tone: "warning",
        icon: <ClockHistory />,
      };
    }

    return {
      label: "Hệ thống ổn định",
      tone: "success",
      icon: <CheckCircleFill />,
    };
  }, [stats]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "65vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <Container fluid>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const statCards = [
    {
      title: "Doanh thu",
      value: formatMoneyShort(stats.total_revenue),
      desc: `Hôm nay: ${formatMoneyFull(stats.today_revenue)}`,
      icon: <CashCoin />,
      tone: "orange",
      trend: `Tháng này ${formatMoneyShort(stats.month_revenue)}`,
    },
    {
      title: "Vé phát hành",
      value: Number(stats.total_tickets || 0).toLocaleString("vi-VN"),
      desc: `${Number(stats.active_tickets || 0).toLocaleString("vi-VN")} vé đang active`,
      icon: <TicketPerforatedFill />,
      tone: "purple",
      trend: `${Number(stats.transfer_pending_tickets || 0)} vé đang khóa`,
    },
    {
      title: "Sự kiện",
      value: Number(stats.total_events || 0).toLocaleString("vi-VN"),
      desc: `${Number(stats.on_sale_events || 0).toLocaleString("vi-VN")} sự kiện mở bán`,
      icon: <CalendarEvent />,
      tone: "green",
      trend: "Quản lý show",
      onClick: () => navigate("/admin/events"),
    },
    {
      title: "Người dùng",
      value: Number(stats.total_customers || 0).toLocaleString("vi-VN"),
      desc: `${Number(stats.total_admins || 0).toLocaleString("vi-VN")} tài khoản admin`,
      icon: <PeopleFill />,
      tone: "blue",
      trend: "Khách hàng",
    },
  ];

  return (
    <Container fluid className="admin-dashboard-page">
      <div className="admin-hero-panel">
        <div>
          <div className="admin-hero-eyebrow">Tổng quan hệ thống VeVuiVe</div>
          <h2>Dashboard quản trị</h2>
          <p>
            Theo dõi bán vé, ví nội bộ, chuyển nhượng bạn bè và sàn giao dịch bằng dữ liệu thật.
          </p>

          <div className="admin-hero-actions">
            <Button
              className="soft-button soft-button-primary"
              onClick={() => navigate("/admin/topup-requests")}
            >
              Duyệt nạp tiền
            </Button>

            <Button
              className="soft-button soft-button-outline"
              onClick={() => navigate("/admin/marketplace")}
            >
              Duyệt sàn vé
            </Button>

            <Button
              className="soft-button soft-button-outline"
              onClick={loadDashboard}
            >
              Làm mới
            </Button>
          </div>
        </div>

        <div className={`admin-health-card ${systemHealth.tone}`}>
          <div className="admin-health-icon">{systemHealth.icon}</div>
          <div>
            <span>Trạng thái</span>
            <strong>{systemHealth.label}</strong>
          </div>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {statCards.map((card) => (
          <Col md={6} xl={3} key={card.title}>
            <Card
              className={`admin-stat-card-v2 ${card.onClick ? "clickable" : ""}`}
              onClick={card.onClick || undefined}
            >
              <Card.Body>
                <div className="admin-stat-topline">
                  <div className={`admin-stat-icon ${card.tone}`}>
                    {card.icon}
                  </div>

                  <span>{card.trend}</span>
                </div>

                <div className="admin-stat-title">{card.title}</div>
                <div className="admin-stat-value">{card.value}</div>
                <div className="admin-stat-desc">{card.desc}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={8}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Doanh thu 7 ngày gần nhất</h5>
                  <p>Tổng tiền thanh toán đơn vé chính thức</p>
                </div>

                <div className="admin-card-chip">
                  <GraphUpArrow />
                  {formatMoneyFull(stats.month_revenue)}
                </div>
              </div>

              <div className="admin-revenue-chart">
                {revenue7Days.map((item) => {
                  const height = Math.max(10, (Number(item.value || 0) / maxRevenue) * 100);

                  return (
                    <div className="admin-revenue-bar-item" key={item.day_key}>
                      <div className="admin-revenue-bar-value">
                        {formatMoneyShort(item.value)}
                      </div>

                      <div className="admin-revenue-bar-track">
                        <div
                          className="admin-revenue-bar-fill"
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <div className="admin-revenue-bar-label">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Việc cần xử lý</h5>
                  <p>Các nghiệp vụ đang chờ admin</p>
                </div>
              </div>

              <div className="admin-action-list">
                <button
                  type="button"
                  className="admin-action-item"
                  onClick={() => navigate("/admin/topup-requests")}
                >
                  <span className="admin-action-icon wallet">
                    <Wallet2 />
                  </span>

                  <span>
                    <strong>{stats.submitted_topup_requests || 0}</strong>
                    <small>Yêu cầu nạp tiền đã báo thanh toán</small>
                  </span>

                  <ArrowRight />
                </button>

                <button
                  type="button"
                  className="admin-action-item"
                  onClick={() => navigate("/admin/marketplace")}
                >
                  <span className="admin-action-icon shop">
                    <Shop />
                  </span>

                  <span>
                    <strong>{stats.waiting_admin_marketplace_listings || 0}</strong>
                    <small>Giao dịch sàn chờ xác nhận</small>
                  </span>

                  <ArrowRight />
                </button>

                <div className="admin-action-item disabled">
                  <span className="admin-action-icon ticket">
                    <Activity />
                  </span>

                  <span>
                    <strong>{stats.pending_transfer_requests || 0}</strong>
                    <small>Chuyển nhượng bạn bè đang chờ user nhận</small>
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={5}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Hiệu suất loại vé</h5>
                  <p>Tỷ lệ đã bán/giữ chỗ theo từng loại vé</p>
                </div>
              </div>

              {ticketTypes.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có dữ liệu loại vé.
                </Alert>
              ) : (
                <div className="admin-ticket-progress-list">
                  {ticketTypes.map((item) => (
                    <div key={item.id} className="admin-ticket-progress-item">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <div className="fw-bold">{item.name}</div>
                          <div className="text-muted small">{item.event_title}</div>
                        </div>

                        <div className="text-end">
                          <div className="fw-bold">{Number(item.sold_percent || 0)}%</div>
                          <div className="text-muted small">
                            {item.quantity_sold}/{item.quantity_total}
                          </div>
                        </div>
                      </div>

                      <div className="admin-progress-track">
                        <div
                          className="admin-progress-fill"
                          style={{
                            width: `${Math.min(Number(item.sold_percent || 0), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={7}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Sự kiện nổi bật theo doanh thu dự kiến</h5>
                  <p>Dựa trên số vé đã bán/giữ chỗ và giá vé</p>
                </div>

                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => navigate("/admin/events")}
                >
                  Quản lý sự kiện
                </Button>
              </div>

              {topEvents.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có sự kiện.
                </Alert>
              ) : (
                <div className="admin-top-event-list">
                  {topEvents.map((event, index) => (
                    <div key={event.id} className="admin-top-event-item">
                      <div className="admin-top-event-rank">
                        {index + 1}
                      </div>

                      <div className="admin-top-event-body">
                        <div className="fw-bold">{event.title}</div>
                        <div className="text-muted small">
                          {event.location} • {formatDateTime(event.event_date)}
                        </div>
                      </div>

                      <div className="admin-top-event-money">
                        <strong>{formatMoneyShort(event.estimated_revenue)}</strong>
                        <span>
                          {event.total_reserved}/{event.total_capacity} vé
                        </span>
                      </div>

                      <Badge bg={getStatusBadge(event.status)}>
                        {renderStatus(event.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Đơn hàng gần đây</h5>
                  <p>Các đơn mới phát sinh trên hệ thống</p>
                </div>
              </div>

              {recentOrders.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có đơn hàng.
                </Alert>
              ) : (
                <Table responsive hover className="table-modern align-middle admin-modern-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>User</th>
                      <th>Tổng tiền</th>
                      <th>Thanh toán</th>
                      <th>Đơn hàng</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <div className="fw-semibold">{order.order_code}</div>
                          <div className="text-muted small">{formatDateTime(order.created_at)}</div>
                        </td>

                        <td>
                          <div className="fw-semibold">{order.full_name}</div>
                          <div className="text-muted small">{order.email}</div>
                        </td>

                        <td>{formatMoneyFull(order.total_amount)}</td>

                        <td>
                          <Badge bg={getStatusBadge(order.payment_status)}>
                            {renderStatus(order.payment_status)}
                          </Badge>
                        </td>

                        <td>
                          <Badge bg={getStatusBadge(order.order_status)}>
                            {renderStatus(order.order_status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Sự kiện sắp diễn ra</h5>
                  <p>Các show gần nhất trong hệ thống</p>
                </div>
              </div>

              {upcomingEvents.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có sự kiện.
                </Alert>
              ) : (
                <div className="admin-event-list">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="admin-event-item">
                      <div>
                        <div className="fw-bold">{event.title}</div>
                        <div className="text-muted small">{event.location}</div>
                        <div className="text-muted small">{formatDateTime(event.event_date)}</div>
                      </div>

                      <Badge bg={getStatusBadge(event.status)}>
                        {renderStatus(event.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xl={6}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Nạp tiền gần đây</h5>
                  <p>Yêu cầu nạp ví nội bộ của user</p>
                </div>

                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => navigate("/admin/topup-requests")}
                >
                  Xem tất cả
                </Button>
              </div>

              {recentTopups.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có yêu cầu nạp tiền.
                </Alert>
              ) : (
                <Table responsive hover className="table-modern align-middle admin-modern-table">
                  <thead>
                    <tr>
                      <th>Mã nạp</th>
                      <th>User</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTopups.map((topup) => (
                      <tr key={topup.id}>
                        <td className="fw-semibold">{topup.topup_code}</td>

                        <td>
                          <div className="fw-semibold">{topup.full_name}</div>
                          <div className="text-muted small">{topup.email}</div>
                        </td>

                        <td>{formatMoneyFull(topup.amount)}</td>

                        <td>
                          <Badge bg={getStatusBadge(topup.status)}>
                            {renderStatus(topup.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={6}>
          <Card className="admin-glass-card h-100">
            <Card.Body className="p-4">
              <div className="admin-card-header">
                <div>
                  <h5>Sàn chuyển nhượng gần đây</h5>
                  <p>Listing và giao dịch mới nhất</p>
                </div>

                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => navigate("/admin/marketplace")}
                >
                  Xem tất cả
                </Button>
              </div>

              {recentMarketplace.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Chưa có listing nào.
                </Alert>
              ) : (
                <Table responsive hover className="table-modern align-middle admin-modern-table">
                  <thead>
                    <tr>
                      <th>Listing</th>
                      <th>Vé</th>
                      <th>Giá</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentMarketplace.map((listing) => (
                      <tr key={listing.id}>
                        <td>
                          <div className="fw-semibold">{listing.listing_code}</div>
                          <div className="text-muted small">
                            {listing.seller_name}
                            {listing.buyer_name ? ` → ${listing.buyer_name}` : ""}
                          </div>
                        </td>

                        <td>
                          <div className="fw-semibold">{listing.ticket_code}</div>
                          <div className="text-muted small">{listing.event_title}</div>
                        </td>

                        <td>{formatMoneyFull(listing.asking_price)}</td>

                        <td>
                          <Badge bg={getStatusBadge(listing.status)}>
                            {renderStatus(listing.status)}
                          </Badge>
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
  );
}

export default AdminDashboardPage;