import { useState, useEffect } from "react";
import { Card, Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getAllEvents } from "../services/eventService";
import { getAuthHeaders } from "../services/authService";

function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await getAllEvents(isAdmin);

        if (response.data?.success && response.data?.data) {
          const eventData = Array.isArray(response.data?.data)
            ? response.data.data
            : [];
          setEvents(eventData);
        } else {
          setError("Không có sự kiện nào");
        }
      } catch (err) {
        console.error("Lỗi khi tải sự kiện:", err);
        setError("Lỗi khi tải sự kiện");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isAdmin]);

  return (
    <Container className="my-5">
      <Row>
        <Col md={12}>
          <h3 className="text-center mb-4">Danh sách sự kiện</h3>
        </Col>
      </Row>
      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <Container className="text-center mt-5">
          <Alert variant="danger">{error}</Alert>
        </Container>
      ) : (
        <Row>
          {events.map((event) => (
            <Col key={event.id} md={4}>
              <Card className="mb-4">
                <Card.Img
                  variant="top"
                  src={event.banner_image ? `/images/${event.banner_image}` : "/images/default-banner.jpg"}
                  alt={event.title}
                />
                <Card.Body>
                  <Card.Title>{event.title}</Card.Title>
                  <Card.Text>{event.description}</Card.Text>
                  <Card.Text><strong>Địa điểm:</strong> {event.location}</Card.Text>
                  <Card.Text><strong>Ngày sự kiện:</strong> {new Date(event.event_date).toLocaleDateString("vi-VN")}</Card.Text>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    Xem chi tiết
                  </button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default HomePage;