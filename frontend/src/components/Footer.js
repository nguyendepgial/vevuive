import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer-user py-5">
      <Container fluid="xl">
        <Row className="g-4">
          <Col md={4}>
            <div className="footer-title fs-4">Concert Ticket</div>
            <p className="mb-0">
              Nền tảng bán vé concert lấy cảm hứng từ trải nghiệm hiện đại của các website sự kiện lớn.
            </p>
          </Col>

          <Col md={2}>
            <div className="footer-title">Khám phá</div>
            <div className="d-flex flex-column gap-2">
              <Link to="/home">Trang chủ</Link>
              <Link to="/profile">Hồ sơ</Link>
            </div>
          </Col>

          <Col md={3}>
            <div className="footer-title">Liên hệ</div>
            <div className="d-flex flex-column gap-2">
              <span>Email: support@concertticket.vn</span>
              <span>Hotline: 0123 456 789</span>
              <span>TP.HCM, Việt Nam</span>
            </div>
          </Col>

          <Col md={3}>
            <div className="footer-title">Mạng xã hội</div>
            <div className="d-flex flex-column gap-2">
              <span>Facebook</span>
              <span>Instagram</span>
              <span>TikTok</span>
            </div>
          </Col>
        </Row>

        <div className="border-top border-secondary mt-4 pt-3 text-center text-white-50">
          © 2026 Concert Ticket.
        </div>
      </Container>
    </footer>
  );
}

export default Footer;