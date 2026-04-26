import { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateBeforeSubmit = () => {
    const nextErrors = {};

    if (!formData.full_name.trim()) {
      nextErrors.full_name = "Vui lòng nhập họ và tên";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email.trim())) {
      nextErrors.email = "Email phải đúng định dạng và có đuôi @gmail.com";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^(0[0-9]{9})$/.test(formData.phone.trim())) {
      nextErrors.phone = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0";
    }

    if (!formData.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-\\[\]/+=~`]).{8,64}$/.test(
        formData.password
      )
    ) {
      nextErrors.password =
        "Mật khẩu phải 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
    }

    if (!formData.confirm_password) {
      nextErrors.confirm_password = "Vui lòng xác nhận mật khẩu";
    } else if (formData.password !== formData.confirm_password) {
      nextErrors.confirm_password = "Xác nhận mật khẩu không khớp";
    }

    return nextErrors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const validationErrors = validateBeforeSubmit();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      if (response.data?.success) {
        setMessage("Đăng ký thành công! Đang chuyển sang trang đăng nhập...");
        setFormData(initialForm);
        setErrors({});

        setTimeout(() => {
          navigate("/login");
        }, 1200);
      } else {
        setError(response.data?.message || "Đăng ký thất bại");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi đăng ký.");
      setErrors(err.response?.data?.errors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <Row className="w-100">
        <Col sm={10} md={7} lg={5} className="mx-auto">
          <Card className="p-4 shadow-sm">
            <Card.Body>
              <h3 className="text-center mb-3">Đăng ký tài khoản</h3>
              <p className="text-center text-muted mb-4">
                Dùng email Gmail, số điện thoại Việt Nam và mật khẩu mạnh theo đúng rule backend.
              </p>

              {error && <Alert variant="danger">{error}</Alert>}
              {message && <Alert variant="success">{message}</Alert>}

              <Form onSubmit={handleRegister}>
                <Form.Group className="mb-3">
                  <Form.Label>Họ và tên</Form.Label>
                  <Form.Control
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên"
                    isInvalid={!!errors.full_name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.full_name}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Ví dụ: tenban@gmail.com"
                    isInvalid={!!errors.email}
                    required
                  />
                  <Form.Text className="text-muted">Backend hiện chỉ chấp nhận email @gmail.com.</Form.Text>
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Số điện thoại</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Ví dụ: 0901234567"
                    isInvalid={!!errors.phone}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.phone}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    isInvalid={!!errors.password}
                    required
                  />
                  <Form.Text className="text-muted">
                    8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Xác nhận mật khẩu</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu"
                    isInvalid={!!errors.confirm_password}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.confirm_password}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                  {loading ? "Đang đăng ký..." : "Đăng ký"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default RegisterPage;