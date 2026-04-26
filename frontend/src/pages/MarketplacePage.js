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
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import {
  getMarketplaceListings,
  buyMarketplaceListing,
} from "../services/marketplaceService";
import { getMyWalletBalance } from "../services/walletBalanceService";
import { getMyWallet } from "../services/walletService";

function MarketplacePage() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [linkedWallet, setLinkedWallet] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedListing, setSelectedListing] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const [showToast, setShowToast] = useState(false);

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (value) => {
    if (!value) return "Không có";
    return new Date(value).toLocaleString("vi-VN");
  };

  const shortenWallet = (address) => {
    if (!address) return "Chưa liên kết";
    if (address.length < 14) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const loadListings = async (params = {}) => {
    const response = await getMarketplaceListings(params);

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Không lấy được danh sách sàn vé");
    }

    setListings(Array.isArray(response.data.data) ? response.data.data : []);
  };

  const loadWalletInfo = async () => {
    try {
      const [walletRes, balanceRes] = await Promise.all([
        getMyWallet(),
        getMyWalletBalance(),
      ]);

      if (walletRes.data?.success) {
        setLinkedWallet(walletRes.data.data || null);
      }

      if (balanceRes.data?.success) {
        setWalletBalance(balanceRes.data.data?.balance || null);
      }
    } catch (err) {
      // User chưa đăng nhập hoặc chưa có ví thì vẫn cho xem sàn
      setLinkedWallet(null);
      setWalletBalance(null);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        loadListings(),
        loadWalletInfo(),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Lỗi khi tải sàn vé");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();

    try {
      setError("");
      await loadListings({
        search,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tìm kiếm listing");
    }
  };

  const openBuyModal = (listing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
    setError("");
    setSuccess("");
  };

  const closeBuyModal = () => {
    if (buying) return;
    setShowBuyModal(false);
    setSelectedListing(null);
  };

  const handleBuy = async () => {
    if (!selectedListing) return;

    try {
      setBuying(true);
      setError("");
      setSuccess("");

      if (!linkedWallet?.wallet_address) {
        setError("Bạn cần đăng nhập và liên kết ví trước khi mua vé trên sàn.");
        return;
      }

      const balance = Number(walletBalance?.balance || 0);
      const price = Number(selectedListing.asking_price || 0);

      if (balance < price) {
        setError("Số dư ví nội bộ không đủ để mua vé này.");
        return;
      }

      const response = await buyMarketplaceListing({
        listingId: selectedListing.id,
        payment_method: "demo",
      });

      if (!response.data?.success) {
        setError(response.data?.message || "Không thể mua vé trên sàn");
        return;
      }

      setSuccess("Mua vé thành công. Giao dịch đang chờ admin xác nhận chuyển nhượng.");
      setShowToast(true);
      setShowBuyModal(false);
      setSelectedListing(null);

      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi mua vé trên sàn");
    } finally {
      setBuying(false);
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
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div>
            <div className="section-title mb-2">Sàn chuyển nhượng vé</div>
            <div className="section-subtitle">
              Nơi người dùng đăng bán lại vé với giá không vượt quá giá gốc.
              Sau khi mua, giao dịch sẽ chờ admin xác nhận chuyển nhượng nội bộ.
            </div>
          </div>

          <Button
            className="soft-button soft-button-primary"
            onClick={() => navigate("/my-listings")}
          >
            Vé tôi đăng bán
          </Button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Row className="g-3 mb-4">
          <Col lg={8}>
            <Card className="payment-card">
              <Card.Body>
                <Form onSubmit={handleSearch}>
                  <Row className="g-2">
                    <Col md={9}>
                      <Form.Control
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo tên show, loại vé hoặc người bán..."
                      />
                    </Col>
                    <Col md={3}>
                      <Button type="submit" className="soft-button soft-button-primary w-100">
                        Tìm kiếm
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="payment-card">
              <Card.Body>
                <div className="fw-bold mb-2">Ví của bạn</div>
                <div className="text-muted small">
                  Ví MetaMask: {shortenWallet(linkedWallet?.wallet_address)}
                </div>
                <div className="text-muted small">
                  Số dư nội bộ:{" "}
                  <strong>{formatMoney(walletBalance?.balance)} {walletBalance?.currency || "VND"}</strong>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {listings.length === 0 ? (
          <Card className="payment-card">
            <Card.Body className="text-center py-5">
              <h5>Chưa có vé nào đang được đăng bán</h5>
              <div className="text-muted">
                Khi người dùng đăng vé lên sàn, listing sẽ hiển thị tại đây.
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {listings.map((listing) => {
              const canAfford =
                Number(walletBalance?.balance || 0) >= Number(listing.asking_price || 0);

              return (
                <Col md={6} lg={4} key={listing.id}>
                  <Card className="event-card h-100">
                    {listing.banner_image && (
                      <div
                        className="event-card-img"
                        style={{
                          backgroundImage: `url(${listing.banner_image})`,
                        }}
                      />
                    )}

                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <Badge bg="success">Đang bán</Badge>
                        <Badge bg="secondary">{listing.ticket_type_name}</Badge>
                      </div>

                      <h5 className="fw-bold mb-2">{listing.event_title}</h5>

                      <div className="text-muted small mb-2">
                        Mã listing: {listing.listing_code}
                      </div>

                      <div className="text-muted small mb-2">
                        Ngày diễn ra: {formatDateTime(listing.event_date)}
                      </div>

                      <div className="text-muted small mb-2">
                        Địa điểm: {listing.event_location || "Chưa cập nhật"}
                      </div>

                      <div className="text-muted small mb-3">
                        Người bán: {listing.seller_name}
                      </div>

                      <div className="market-price-box mb-3">
                        <div className="text-muted small">Giá gốc</div>
                        <div>{formatMoney(listing.original_price)} VND</div>

                        <div className="text-muted small mt-2">Giá bán lại</div>
                        <div className="fw-bold fs-5 text-success">
                          {formatMoney(listing.asking_price)} VND
                        </div>
                      </div>

                      <div className="mt-auto">
                        <Button
                          className="soft-button soft-button-primary w-100"
                          onClick={() => openBuyModal(listing)}
                          disabled={linkedWallet?.wallet_address && !canAfford}
                        >
                          {!linkedWallet?.wallet_address
                            ? "Đăng nhập để mua"
                            : canAfford
                              ? "Mua vé này"
                              : "Không đủ số dư"}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>

      <Modal show={showBuyModal} onHide={closeBuyModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận mua vé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedListing && (
            <>
              <Alert variant="info">
                Sau khi mua, tiền sẽ được trừ khỏi ví nội bộ của bạn.
                Vé sẽ được chuyển sang bạn sau khi admin xác nhận giao dịch.
              </Alert>

              <div className="payment-summary-box mb-3">
                <div className="fw-bold mb-2">{selectedListing.event_title}</div>
                <div className="text-muted">
                  Loại vé: {selectedListing.ticket_type_name}
                </div>
                <div className="text-muted">
                  Người bán: {selectedListing.seller_name}
                </div>
              </div>

              <div className="payment-summary-box">
                <div className="d-flex justify-content-between mb-2">
                  <span>Giá vé</span>
                  <strong>{formatMoney(selectedListing.asking_price)} VND</strong>
                </div>

                <div className="d-flex justify-content-between">
                  <span>Số dư hiện tại</span>
                  <strong>{formatMoney(walletBalance?.balance)} VND</strong>
                </div>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={closeBuyModal}
            disabled={buying}
          >
            Hủy
          </Button>

          <Button
            className="soft-button soft-button-primary"
            onClick={handleBuy}
            disabled={buying}
          >
            {buying ? "Đang mua..." : "Xác nhận mua"}
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
            <strong className="me-auto">Mua vé thành công</strong>
            <small>Vừa xong</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            Giao dịch đang chờ admin xác nhận chuyển nhượng.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default MarketplacePage;