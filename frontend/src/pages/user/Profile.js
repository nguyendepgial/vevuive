import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import '../../styles/card.css'; // Thêm một cặp ../ nữa để ra hẳn thư mục src
function Profile() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Lấy thông tin user từ localStorage mà bạn đã lưu lúc đăng nhập
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    setUserData(storedUser);
  }, []);

  if (!userData) return <p className="text-center mt-5">Vui lòng đăng nhập...</p>;

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="shadow">
            <Card.Header as="h5" className="card-bg-profile text-white">Hồ sơ cá nhân</Card.Header>
            <Card.Body>
              <Card.Text><strong>Họ và tên:</strong> {userData.full_name}</Card.Text>
              <Card.Text><strong>Email:</strong> {userData.email}</Card.Text>
              <Card.Text><strong>Số điện thoại:</strong> {userData.phone}</Card.Text>
              <Card.Text><strong>Vai trò:</strong> {userData.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Profile;