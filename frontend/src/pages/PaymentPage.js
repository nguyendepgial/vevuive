import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Card,
  Button,
  Alert,
  Spinner,
  Table,
  Badge,
  Row,
  Col,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import { getOrderDetail } from "../services/orderService";
import { payOrder } from "../services/paymentService";
import { getMyWallet } from "../services/walletService";
import { getMyWalletBalance } from "../services/walletBalanceService";

function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const [linkedWallet, setLinkedWallet] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [paidInfo, setPaidInfo] = useState({
    amount: 0,
    orderCode: "",
  });

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const shortenWallet = (address) => {
    if (!address) return "Chưa liên kết";
    if (address.length < 14) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const loadOrder = async () => {
    const response = await getOrderDetail(orderId);

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Không lấy được thông tin đơn hàng");
    }

    const payload = response.data.data;

    setOrder(payload);
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setPayments(Array.isArray(payload.payments) ? payload.payments : []);

    if (payload.payment_status === "paid" && payload.order_status === "completed") {
      setSuccess("Đơn hàng đã thanh toán và vé đã được phát hành.");
    }
  };

  const loadLinkedWallet = async () => {
    try {
      const response = await getMyWallet();

      if (response.data?.success && response.data?.data) {
        setLinkedWallet(response.data.data);
      } else {
        setLinkedWallet(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setLinkedWallet(null);
      } else {
        throw err;
      }
    }
  };

  const loadWalletBalance = async () => {
    const response = await getMyWalletBalance();

    if (response.data?.success) {
      setWalletBalance(response.data.data?.balance || null);
    } else {
      setWalletBalance(null);
    }
  };

  const reloadAll = async () => {
    await Promise.all([loadOrder(), loadLinkedWallet(), loadWalletBalance()]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        await reloadAll();
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Lỗi khi tải dữ liệu thanh toán");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  useEffect(() => {
    if (!order?.expires_at) {
      setTimeLeft(0);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expireTime = new Date(order.expires_at).getTime();
      const diff = Math.max(0, Math.floor((expireTime - now) / 1000));
      setTimeLeft(diff);
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [order]);

  const latestPayment = useMemo(() => {
    if (!payments.length) return null;
    return payments[0];
  }, [payments]);

  const isPaid = order?.payment_status === "paid";

  const isExpired =
    order?.payment_status === "expired" ||
    order?.order_status === "expired" ||
    (order?.expires_at && timeLeft <= 0 && order?.payment_status !== "paid");

  const orderTotal = Number(order?.total_amount || 0);
  const currentBalance = Number(walletBalance?.balance || 0);
  const hasEnoughBalance = currentBalance >= orderTotal;

  const getPaymentBadge = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "failed":
        return "danger";
      case "expired":
        return "secondary";
      case "refunded":
        return "dark";
      default:
        return "warning";
    }
  };

  const getOrderBadge = (status) => {
    switch (status) {
      case "awaiting_payment":
        return "warning";
      case "processing":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "secondary";
      case "expired":
        return "dark";
      default:
        return "warning";
    }
  };

  const renderPaymentText = (status) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "paid":
        return "Đã thanh toán";
      case "failed":
        return "Thất bại";
      case "expired":
        return "Hết hạn";
      case "refunded":
        return "Đã hoàn tiền";
      default:
        return status || "Không xác định";
    }
  };

  const renderOrderText = (status) => {
    switch (status) {
      case "awaiting_payment":
        return "Chờ thanh toán";
      case "processing":
        return "Đang xử lý";
      case "completed":
        return "Hoàn tất";
      case "cancelled":
        return "Đã hủy";
      case "expired":
        return "Hết hạn";
      default:
        return status || "Không xác định";
    }
  };

  const handlePay = async () => {
    try {
      if (!order) return;

      setError("");
      setSuccess("");

      if (isPaid) {
        setError("Đơn hàng đã được thanh toán.");
        return;
      }

      if (isExpired) {
        setError("Đơn hàng đã hết thời gian thanh toán.");
        return;
      }

      if (!linkedWallet?.wallet_address) {
        setError("Bạn cần liên kết ví MetaMask trước khi thanh toán để hệ thống gắn vé vào ví.");
        return;
      }

      if (!hasEnoughBalance) {
        setError("Số dư ví nội bộ không đủ để thanh toán đơn hàng.");
        return;
      }

      setPaying(true);

      const response = await payOrder({
        order_id: Number(order.id),
        payment_method: "demo",
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể thanh toán đơn hàng");
        return;
      }

      const nextOrder = response.data?.data?.order || null;

      setPaidInfo({
        amount: Number(nextOrder?.total_amount || order?.total_amount || 0),
        orderCode: nextOrder?.order_code || order?.order_code || "",
      });

      setShowSuccessToast(true);
      setSuccess("Thanh toán thành công. Vé đã được phát hành.");

      await reloadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi xử lý thanh toán");
    } finally {
      setPaying(false);
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

  if (!order) {
    return (
      <Container className="user-shell text-center">
        <h3>Không tìm thấy đơn hàng</h3>
      </Container>
    );
  }

  return (
    <>
      <Container className="user-shell">
        <Row className="g-4">
          <Col lg={8}>
            <Card className="payment-card">
              <Card.Body className="p-4 p-lg-5">
                <div className="section-title mb-2">Thanh toán đơn hàng</div>
                <div className="section-subtitle mb-4">
                  Thanh toán bằng ví nội bộ VNĐ. Ví MetaMask dùng để gắn vé với địa chỉ ví của bạn.
                </div>

                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                {order?.expires_at && !isPaid && (
                  <Alert variant={isExpired ? "danger" : "warning"}>
                    {isExpired ? (
                      <>Đơn hàng đã hết thời gian thanh toán.</>
                    ) : (
                      <>
                        Thời gian còn lại để thanh toán:{" "}
                        <strong>{formatTimeLeft(timeLeft)}</strong>
                      </>
                    )}
                  </Alert>
                )}

                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <div className="payment-summary-box">
                      <div className="text-muted mb-1">Mã đơn</div>
                      <div className="fw-bold fs-5">{order.order_code}</div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="payment-summary-box">
                      <div className="text-muted mb-1">Tổng tiền</div>
                      <div className="fw-bold fs-5">{formatMoney(order.total_amount)} VND</div>
                    </div>
                  </Col>
                </Row>

                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <div className="payment-summary-box">
                      <div className="text-muted mb-1">Ví MetaMask đã liên kết</div>
                      <div className="fw-bold">
                        {linkedWallet?.wallet_address
                          ? shortenWallet(linkedWallet.wallet_address)
                          : "Chưa liên kết"}
                      </div>
                      {linkedWallet?.network_name && (
                        <div className="text-muted small mt-1">
                          Mạng: {linkedWallet.network_name}
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="payment-summary-box">
                      <div className="text-muted mb-1">Số dư ví nội bộ</div>
                      <div className={hasEnoughBalance || isPaid ? "fw-bold text-success" : "fw-bold text-danger"}>
                        {formatMoney(walletBalance?.balance)} {walletBalance?.currency || "VND"}
                      </div>
                      {!isPaid && (
                        <div className="text-muted small mt-1">
                          Sau thanh toán còn:{" "}
                          {formatMoney(Math.max(currentBalance - orderTotal, 0))} VND
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>

                <div className="d-flex gap-3 flex-wrap mb-4">
                  <Badge bg={getPaymentBadge(order.payment_status)} className="status-badge">
                    Thanh toán: {renderPaymentText(order.payment_status)}
                  </Badge>

                  <Badge bg={getOrderBadge(order.order_status)} className="status-badge">
                    Đơn hàng: {renderOrderText(order.order_status)}
                  </Badge>
                </div>

                <h5 className="fw-bold mb-3">Chi tiết vé</h5>

                <Table responsive hover className="table-modern align-middle mb-4">
                  <thead>
                    <tr>
                      <th>Loại vé</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-semibold">{item.ticket_type_name_snapshot}</td>
                        <td>{item.quantity}</td>
                        <td>{formatMoney(item.unit_price)} VND</td>
                        <td>{formatMoney(item.subtotal)} VND</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {!linkedWallet?.wallet_address && !isPaid && (
                  <Alert variant="warning">
                    Bạn chưa liên kết ví. Hãy liên kết ví trước để hệ thống phát hành vé về địa chỉ ví của bạn.
                  </Alert>
                )}

                {!hasEnoughBalance && !isPaid && (
                  <Alert variant="danger">
                    Số dư ví nội bộ chưa đủ. Vui lòng liên hệ admin nạp tiền demo vào ví nội bộ.
                  </Alert>
                )}

                <div className="d-flex gap-3 flex-wrap">
                  {!isPaid && !isExpired && (
                    <Button
                      className="soft-button soft-button-primary"
                      onClick={handlePay}
                      disabled={paying || !linkedWallet?.wallet_address || !hasEnoughBalance}
                    >
                      {paying ? "Đang xử lý..." : "Thanh toán bằng ví nội bộ"}
                    </Button>
                  )}

                  {isPaid && (
                    <Button
                      className="soft-button soft-button-primary"
                      onClick={() => navigate("/profile")}
                    >
                      Xem vé của tôi
                    </Button>
                  )}

                  {!linkedWallet?.wallet_address && !isPaid && (
                    <Button
                      className="soft-button soft-button-dark"
                      onClick={() => navigate("/profile")}
                    >
                      Đi tới hồ sơ để liên kết ví
                    </Button>
                  )}

                  <Button
                    className="soft-button soft-button-outline"
                    onClick={() => navigate("/home")}
                  >
                    Về trang chủ
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="payment-card mb-4">
              <Card.Body className="p-4">
                <div className="section-title mb-3" style={{ fontSize: "1.4rem" }}>
                  Tiến trình
                </div>

                <div className="d-flex flex-column gap-3">
                  <div className="payment-summary-box">
                    <div className="fw-bold">1. Tạo đơn hàng</div>
                    <div className="text-muted">Đã hoàn tất</div>
                  </div>

                  <div className="payment-summary-box">
                    <div className="fw-bold">2. Thanh toán ví nội bộ</div>
                    <div className="text-muted">{isPaid ? "Đã hoàn tất" : "Chưa hoàn tất"}</div>
                  </div>

                  <div className="payment-summary-box">
                    <div className="fw-bold">3. Phát hành vé</div>
                    <div className="text-muted">
                      {order.order_status === "completed"
                        ? "Vé đã được phát hành"
                        : "Chờ thanh toán"}
                    </div>
                  </div>

                  <div className="payment-summary-box">
                    <div className="fw-bold">4. Blockchain/NFT</div>
                    <div className="text-muted">
                      Thông tin blockchain là tùy chọn. Vé active vẫn có hiệu lực trong hệ thống.
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card className="payment-card">
              <Card.Body className="p-4">
                <div className="section-title mb-3" style={{ fontSize: "1.4rem" }}>
                  Lần thanh toán gần nhất
                </div>

                {latestPayment ? (
                  <div className="payment-summary-box">
                    <div className="mb-2">
                      <strong>Mã thanh toán:</strong> {latestPayment.payment_code}
                    </div>
                    <div className="mb-2">
                      <strong>Phương thức:</strong>{" "}
                      {latestPayment.payment_method === "demo"
                        ? "Ví nội bộ"
                        : latestPayment.payment_method}
                    </div>
                    <div className="mb-2">
                      <strong>Số tiền:</strong>{" "}
                      {formatMoney(latestPayment.amount)} {latestPayment.currency}
                    </div>
                    <div className="mb-2">
                      <strong>Trạng thái:</strong> {latestPayment.status}
                    </div>
                    <div>
                      <strong>Thời gian:</strong> {formatDateTime(latestPayment.paid_at)}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">Chưa có bản ghi thanh toán nào.</div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <ToastContainer
        position="top-end"
        className="p-3"
        style={{ zIndex: 2000 }}
      >
        <Toast
          bg="success"
          onClose={() => setShowSuccessToast(false)}
          show={showSuccessToast}
          delay={4500}
          autohide
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Thanh toán thành công</strong>
            <small>Vừa xong</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            Đã trừ số tiền{" "}
            <strong>{formatMoney(paidInfo.amount)} VND</strong>{" "}
            cho đơn hàng <strong>{paidInfo.orderCode}</strong>.
            <br />
            Vé đã được phát hành và có thể xem trong hồ sơ.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default PaymentPage;