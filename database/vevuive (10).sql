-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th4 26, 2026 lúc 02:25 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `vevuive`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `events`
--

CREATE TABLE `events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `event_date` datetime NOT NULL,
  `banner_image` varchar(500) DEFAULT NULL,
  `organizer_name` varchar(150) DEFAULT NULL,
  `status` enum('draft','upcoming','on_sale','sold_out','ended','cancelled') NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `events`
--

INSERT INTO `events` (`id`, `title`, `slug`, `description`, `location`, `event_date`, `banner_image`, `organizer_name`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Concert Updated', 'son-tung-m-tp-live-concert-2026', 'Đêm nhạc đặc biệt của Sơn Tùng M-TP', 'TP.HCM', '2026-08-15 19:30:00', 'https://example.com/banner-st.jpg', 'Vui Ve Production', 'on_sale', 2, '2026-04-10 12:21:52', '2026-04-10 12:22:21'),
(2, 'Concert Test 2026', 'concert-test-2026', 'Su kien test', 'TP.HCM', '2026-12-20 19:30:00', 'https://example.com/banner.jpg', 'VeVuiVe', 'on_sale', 2, '2026-04-10 13:15:29', '2026-04-10 13:15:29');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `event_questions`
--

CREATE TABLE `event_questions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `question_text` varchar(500) NOT NULL,
  `question_type` enum('text','textarea','single_choice','checkbox') NOT NULL DEFAULT 'text',
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `event_question_options`
--

CREATE TABLE `event_question_options` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `question_id` bigint(20) UNSIGNED NOT NULL,
  `option_text` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_code` varchar(50) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','paid','failed','refunded','expired') NOT NULL DEFAULT 'pending',
  `order_status` enum('pending','awaiting_payment','processing','completed','cancelled','failed','expired') NOT NULL DEFAULT 'pending',
  `payment_method` enum('demo','metamask','stripe','bank_transfer','cash') NOT NULL DEFAULT 'demo',
  `notes` text DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `orders`
--

INSERT INTO `orders` (`id`, `order_code`, `user_id`, `total_amount`, `payment_status`, `order_status`, `payment_method`, `notes`, `expires_at`, `cancelled_at`, `cancel_reason`, `created_at`, `updated_at`) VALUES
(1, 'ORD202604101325509301', 3, 3000000.00, 'pending', 'awaiting_payment', 'demo', 'Đặt vé test', '2026-04-10 13:40:50', '2026-04-10 13:26:53', 'Đổi kế hoạch', '2026-04-10 13:25:50', '2026-04-10 13:44:11'),
(2, 'ORD202604101344434487', 3, 3000000.00, 'paid', 'completed', 'metamask', 'Đặt vé test payment', '2026-04-10 13:59:43', NULL, NULL, '2026-04-10 13:44:43', '2026-04-10 13:59:53'),
(3, 'ORD202604232051104051', 3, 4500000.00, 'pending', 'awaiting_payment', 'demo', NULL, '2026-04-23 21:06:10', NULL, NULL, '2026-04-23 20:51:10', '2026-04-23 20:51:10'),
(4, 'ORD202604232203084286', 3, 6000000.00, 'pending', 'awaiting_payment', 'demo', NULL, '2026-04-23 22:18:08', NULL, NULL, '2026-04-23 22:03:08', '2026-04-23 22:03:08'),
(5, 'ORD202604232241596344', 3, 4500000.00, 'pending', 'awaiting_payment', 'demo', NULL, '2026-04-23 22:56:59', NULL, NULL, '2026-04-23 22:41:59', '2026-04-23 22:41:59'),
(6, 'ORD202604232308153230', 3, 1500000.00, 'pending', 'awaiting_payment', 'demo', NULL, '2026-04-23 23:23:15', NULL, NULL, '2026-04-23 23:08:15', '2026-04-23 23:08:15'),
(7, 'ORD202604232355006884', 5, 4500000.00, 'paid', 'processing', 'metamask', NULL, '2026-04-24 00:10:00', NULL, NULL, '2026-04-23 23:55:00', '2026-04-24 00:01:44'),
(8, 'ORD202604240008564648', 5, 1500000.00, 'paid', 'processing', 'demo', NULL, '2026-04-24 00:23:56', NULL, NULL, '2026-04-24 00:08:56', '2026-04-24 00:09:05'),
(9, 'ORD202604240009191115', 5, 1500000.00, 'paid', 'processing', 'metamask', NULL, '2026-04-24 00:24:19', NULL, NULL, '2026-04-24 00:09:19', '2026-04-24 00:10:20'),
(10, 'ORD202604240012343887', 5, 4500000.00, 'paid', 'processing', 'metamask', NULL, '2026-04-24 00:27:34', NULL, NULL, '2026-04-24 00:12:34', '2026-04-24 00:22:04'),
(23, 'ORD202604252015545046', 6, 4500000.00, 'paid', 'completed', 'demo', NULL, '2026-04-25 20:30:54', NULL, NULL, '2026-04-25 20:15:54', '2026-04-25 20:15:58'),
(24, 'ORD202604252229253853', 6, 1500000.00, 'paid', 'completed', 'demo', NULL, '2026-04-25 22:44:25', NULL, NULL, '2026-04-25 22:29:25', '2026-04-25 22:29:27');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_type_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_type_name_snapshot` varchar(100) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`unit_price` * `quantity`) STORED,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `ticket_type_id`, `ticket_type_name_snapshot`, `unit_price`, `quantity`, `created_at`) VALUES
(1, 1, 2, 'VIP', 1500000.00, 2, '2026-04-10 13:25:50'),
(2, 2, 2, 'VIP', 1500000.00, 2, '2026-04-10 13:44:43'),
(3, 3, 2, 'VIP', 1500000.00, 3, '2026-04-23 20:51:10'),
(4, 4, 2, 'VIP', 1500000.00, 4, '2026-04-23 22:03:08'),
(5, 5, 2, 'VIP', 1500000.00, 3, '2026-04-23 22:41:59'),
(6, 6, 2, 'VIP', 1500000.00, 1, '2026-04-23 23:08:15'),
(7, 7, 2, 'VIP', 1500000.00, 3, '2026-04-23 23:55:00'),
(8, 8, 2, 'VIP', 1500000.00, 1, '2026-04-24 00:08:56'),
(9, 9, 2, 'VIP', 1500000.00, 1, '2026-04-24 00:09:19'),
(10, 10, 2, 'VIP', 1500000.00, 3, '2026-04-24 00:12:34'),
(11, 11, 2, 'VIP', 1500000.00, 4, '2026-04-24 00:35:08'),
(12, 12, 2, 'VIP', 1500000.00, 1, '2026-04-24 00:36:06'),
(13, 13, 2, 'VIP', 1500000.00, 4, '2026-04-24 00:54:37'),
(14, 14, 2, 'VIP', 1500000.00, 2, '2026-04-24 01:06:14'),
(15, 15, 2, 'VIP', 1500000.00, 3, '2026-04-24 09:18:45'),
(16, 16, 2, 'VIP', 1500000.00, 1, '2026-04-24 09:23:37'),
(17, 17, 2, 'VIP', 1500000.00, 1, '2026-04-24 21:56:26'),
(18, 18, 2, 'VIP', 1500000.00, 1, '2026-04-24 23:41:36'),
(19, 19, 2, 'VIP', 1500000.00, 1, '2026-04-25 00:04:13'),
(20, 20, 2, 'VIP', 1500000.00, 1, '2026-04-25 20:07:12'),
(21, 21, 2, 'VIP', 1500000.00, 2, '2026-04-25 20:12:23'),
(22, 22, 2, 'VIP', 1500000.00, 2, '2026-04-25 20:13:37'),
(23, 23, 2, 'VIP', 1500000.00, 3, '2026-04-25 20:15:54'),
(24, 24, 2, 'VIP', 1500000.00, 1, '2026-04-25 22:29:25');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_question_answers`
--

CREATE TABLE `order_question_answers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `question_id` bigint(20) UNSIGNED NOT NULL,
  `question_text_snapshot` varchar(500) NOT NULL,
  `answer_text` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payment_code` varchar(50) NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `payment_method` enum('demo','metamask','stripe','bank_transfer','cash') NOT NULL DEFAULT 'demo',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `gateway_transaction_id` varchar(150) DEFAULT NULL,
  `blockchain_tx_hash` char(66) DEFAULT NULL,
  `payer_wallet_address` char(42) DEFAULT NULL,
  `status` enum('pending','success','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `gateway_response` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `payments`
--

INSERT INTO `payments` (`id`, `payment_code`, `order_id`, `payment_method`, `amount`, `currency`, `gateway_transaction_id`, `blockchain_tx_hash`, `payer_wallet_address`, `status`, `paid_at`, `gateway_response`, `created_at`, `updated_at`) VALUES
(1, 'PAY202604101345085855', 2, 'metamask', 3000000.00, 'VND', NULL, '0x1111111111111111111111111111111111111111111111111111111111111111', '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 'success', '2026-04-10 13:45:08', NULL, '2026-04-10 13:45:08', '2026-04-10 13:45:08'),
(2, 'PAY202604240001443781', 7, 'metamask', 4500000.00, 'VND', NULL, '0x1111111111111111111111111111111111111111111111111111111111111111', '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 00:01:44', '{\"source\":\"frontend-demo\",\"submitted_at\":\"2026-04-23T17:01:44.184Z\"}', '2026-04-24 00:01:44', '2026-04-24 00:01:44'),
(3, 'PAY202604240009055636', 8, 'demo', 1500000.00, 'VND', NULL, NULL, NULL, 'success', '2026-04-24 00:09:05', '{\"source\":\"frontend-demo\",\"submitted_at\":\"2026-04-23T17:09:05.124Z\"}', '2026-04-24 00:09:05', '2026-04-24 00:09:05'),
(4, 'PAY202604240010204478', 9, 'metamask', 1500000.00, 'VND', NULL, '0x1111111111111111111111111111111111111111111111111111111111111111', '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 00:10:20', '{\"source\":\"frontend-demo\",\"submitted_at\":\"2026-04-23T17:10:20.612Z\"}', '2026-04-24 00:10:20', '2026-04-24 00:10:20'),
(5, 'PAY202604240022043966', 10, 'metamask', 4500000.00, 'VND', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 00:22:04', '{\"source\":\"frontend-demo\",\"submitted_at\":\"2026-04-23T17:22:04.744Z\"}', '2026-04-24 00:22:04', '2026-04-24 00:22:04'),
(6, 'PAY202604240035459543', 11, 'metamask', 6000000.00, 'VND', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 00:35:45', '{\"source\":\"frontend-metamask-level-1\",\"submitted_at\":\"2026-04-23T17:35:45.844Z\"}', '2026-04-24 00:35:45', '2026-04-24 00:35:45'),
(7, 'PAY202604240054506402', 13, 'metamask', 6000000.00, 'VND', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 00:54:50', '{\"source\":\"frontend-metamask-level-1\",\"submitted_at\":\"2026-04-23T17:54:50.960Z\"}', '2026-04-24 00:54:50', '2026-04-24 00:54:50'),
(8, 'PAY202604240106272660', 14, 'metamask', 3000000.00, 'VND', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 01:06:27', '{\"source\":\"frontend-metamask-level-1\",\"submitted_at\":\"2026-04-23T18:06:27.578Z\"}', '2026-04-24 01:06:27', '2026-04-24 01:06:27'),
(9, 'PAY202604240918552459', 15, 'metamask', 4500000.00, 'VND', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 09:18:55', '{\"source\":\"frontend-metamask-level-1\",\"submitted_at\":\"2026-04-24T02:18:55.437Z\"}', '2026-04-24 09:18:55', '2026-04-24 09:18:55'),
(10, 'PAY202604240923444362', 16, 'metamask', 1500000.00, 'VND', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 09:23:44', '{\"source\":\"frontend-metamask-level-1\",\"submitted_at\":\"2026-04-24T02:23:44.354Z\"}', '2026-04-24 09:23:44', '2026-04-24 09:23:44'),
(11, 'PAY202604242156588484', 17, 'demo', 1500000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-24 21:56:58', '{\"source\":\"frontend-demo\",\"submitted_at\":\"2026-04-24T14:56:58.881Z\"}', '2026-04-24 21:56:58', '2026-04-24 21:56:58'),
(12, 'PAY202604242342136171', 18, 'demo', 1500000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-24 23:42:13', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":3,\"submitted_data\":null}', '2026-04-24 23:42:13', '2026-04-24 23:42:13'),
(13, 'PAY202604250005592492', 19, 'demo', 1500000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-25 00:05:59', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":4,\"submitted_data\":null}', '2026-04-25 00:05:59', '2026-04-25 00:05:59'),
(14, 'PAY202604252007306266', 20, 'demo', 1500000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-25 20:07:30', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":7,\"submitted_data\":null}', '2026-04-25 20:07:30', '2026-04-25 20:07:30'),
(15, 'PAY202604252012257380', 21, 'demo', 3000000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-25 20:12:25', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":8,\"submitted_data\":null}', '2026-04-25 20:12:25', '2026-04-25 20:12:25'),
(16, 'PAY202604252013419633', 22, 'demo', 3000000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-25 20:13:41', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":9,\"submitted_data\":null}', '2026-04-25 20:13:41', '2026-04-25 20:13:41'),
(17, 'PAY202604252015587000', 23, 'demo', 4500000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-25 20:15:58', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":10,\"submitted_data\":null}', '2026-04-25 20:15:58', '2026-04-25 20:15:58'),
(18, 'PAY202604252229278197', 24, 'demo', 1500000.00, 'VND', NULL, NULL, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'success', '2026-04-25 22:29:27', '{\"source\":\"internal_wallet\",\"note\":\"Thanh toán bằng ví nội bộ trong hệ thống\",\"wallet_transaction_id\":14,\"submitted_data\":null}', '2026-04-25 22:29:27', '2026-04-25 22:29:27');

--
-- Bẫy `payments`
--
DELIMITER $$
CREATE TRIGGER `trg_payments_bi_lowercase_wallet` BEFORE INSERT ON `payments` FOR EACH ROW BEGIN
  IF NEW.payer_wallet_address IS NOT NULL THEN
    SET NEW.payer_wallet_address = LOWER(TRIM(NEW.payer_wallet_address));
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_payments_bu_lowercase_wallet` BEFORE UPDATE ON `payments` FOR EACH ROW BEGIN
  IF NEW.payer_wallet_address IS NOT NULL THEN
    SET NEW.payer_wallet_address = LOWER(TRIM(NEW.payer_wallet_address));
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tickets`
--

CREATE TABLE `tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_code` varchar(50) NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_type_id` bigint(20) UNSIGNED NOT NULL,
  `owner_user_id` bigint(20) UNSIGNED NOT NULL,
  `owner_wallet_address` char(42) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `ticket_status` enum('pending_mint','active','transfer_pending','used','cancelled','invalid') NOT NULL DEFAULT 'pending_mint',
  `blockchain_ticket_id` varchar(100) DEFAULT NULL,
  `contract_address` char(42) DEFAULT NULL,
  `mint_tx_hash` char(66) DEFAULT NULL,
  `metadata_uri` varchar(500) DEFAULT NULL,
  `mint_status` enum('pending','minted','failed') NOT NULL DEFAULT 'pending',
  `minted_at` datetime DEFAULT NULL,
  `transferred_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `last_transfer_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `tickets`
--

INSERT INTO `tickets` (`id`, `ticket_code`, `order_id`, `order_item_id`, `event_id`, `ticket_type_id`, `owner_user_id`, `owner_wallet_address`, `unit_price`, `ticket_status`, `blockchain_ticket_id`, `contract_address`, `mint_tx_hash`, `metadata_uri`, `mint_status`, `minted_at`, `transferred_count`, `last_transfer_at`, `created_at`, `updated_at`) VALUES
(1, 'TCK202604101359537729', 2, 2, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'active', '1', '0x38c99df26a06ab4da9d0a00570f06b3c5938fcf8', '0xb7691d80c0601290db87ee02152c4a6391b1d3f43fc4b2b1a118fc8ba93a6cb7', 'http://localhost:5001/api/users/tickets/1', 'minted', '2026-04-11 00:07:40', 1, '2026-04-24 09:30:36', '2026-04-10 13:59:53', '2026-04-24 09:30:36'),
(2, 'TCK202604101359533301', 2, 2, 1, 2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-10 13:59:53', '2026-04-10 13:59:53'),
(3, 'TCK202604240054513359', 13, 13, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 00:54:51', '2026-04-24 00:54:51'),
(4, 'TCK202604240054515628', 13, 13, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 00:54:51', '2026-04-24 00:54:51'),
(5, 'TCK202604240054515678', 13, 13, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 00:54:51', '2026-04-24 00:54:51'),
(6, 'TCK202604240054517138', 13, 13, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 00:54:51', '2026-04-24 00:54:51'),
(7, 'TCK202604240106276247', 14, 14, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 01:06:27', '2026-04-24 01:06:27'),
(8, 'TCK202604240106273081', 14, 14, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 01:06:27', '2026-04-24 01:06:27'),
(9, 'TCK202604240918551939', 15, 15, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 09:18:55', '2026-04-24 09:18:55'),
(10, 'TCK202604240918557534', 15, 15, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 09:18:55', '2026-04-24 09:18:55'),
(11, 'TCK202604240918556215', 15, 15, 1, 2, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-24 09:18:55', '2026-04-24 09:18:55'),
(12, 'TCK202604240923443492', 16, 16, 1, 2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 'active', '2', '0x38c99df26a06ab4da9d0a00570f06b3c5938fcf8', '0x2c017be2121f84806edf3af2198979fdd7bc6db68faa9a6dba8e86dfca8b1f9f', 'http://localhost:5001/api/users/tickets/12', 'minted', '2026-04-24 09:24:06', 1, '2026-04-24 09:26:47', '2026-04-24 09:23:44', '2026-04-24 09:26:47'),
(13, 'TCK202604242156588958', 17, 17, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'transfer_pending', '3', '0x38c99df26a06ab4da9d0a00570f06b3c5938fcf8', '0xe1c0f32ee4c83c927d20f3a544e213edd83ee53d7735be714333c15cf86c16ab', 'http://localhost:5001/api/users/tickets/13', 'minted', '2026-04-24 21:57:28', 0, NULL, '2026-04-24 21:56:58', '2026-04-25 20:11:12'),
(14, 'TCK202604242342133626', 18, 18, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/14', 'pending', NULL, 0, NULL, '2026-04-24 23:42:13', '2026-04-25 20:10:49'),
(15, 'TCK202604250005594000', 19, 19, 1, 2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/15', 'pending', NULL, 1, '2026-04-25 20:45:12', '2026-04-25 00:05:59', '2026-04-25 20:45:12'),
(16, 'TCK202604252007309372', 20, 20, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/16', 'pending', NULL, 0, NULL, '2026-04-25 20:07:30', '2026-04-25 20:07:30'),
(17, 'TCK202604252012252546', 21, 21, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/17', 'pending', NULL, 0, NULL, '2026-04-25 20:12:25', '2026-04-25 20:12:25'),
(18, 'TCK202604252012257844', 21, 21, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/18', 'pending', NULL, 0, NULL, '2026-04-25 20:12:25', '2026-04-25 20:12:25'),
(19, 'TCK202604252013419812', 22, 22, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/19', 'pending', NULL, 0, NULL, '2026-04-25 20:13:41', '2026-04-25 20:13:41'),
(20, 'TCK202604252013414271', 22, 22, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/20', 'pending', NULL, 0, NULL, '2026-04-25 20:13:41', '2026-04-25 20:13:41'),
(21, 'TCK202604252015581174', 23, 23, 1, 2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/21', 'pending', NULL, 1, '2026-04-25 20:45:09', '2026-04-25 20:15:58', '2026-04-25 20:45:09'),
(22, 'TCK202604252015582767', 23, 23, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'transfer_pending', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/22', 'pending', NULL, 0, NULL, '2026-04-25 20:15:58', '2026-04-25 20:23:46'),
(23, 'TCK202604252015581589', 23, 23, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'transfer_pending', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/23', 'pending', NULL, 0, NULL, '2026-04-25 20:15:58', '2026-04-25 20:23:41'),
(24, 'TCK202604252229278347', 24, 24, 1, 2, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 1500000.00, 'active', NULL, NULL, NULL, 'http://localhost:5001/api/users/tickets/24', 'pending', NULL, 0, NULL, '2026-04-25 22:29:27', '2026-04-25 22:29:27');

--
-- Bẫy `tickets`
--
DELIMITER $$
CREATE TRIGGER `trg_tickets_bi_lowercase_wallets` BEFORE INSERT ON `tickets` FOR EACH ROW BEGIN
  SET NEW.owner_wallet_address = LOWER(TRIM(NEW.owner_wallet_address));
  IF NEW.contract_address IS NOT NULL THEN
    SET NEW.contract_address = LOWER(TRIM(NEW.contract_address));
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_tickets_bu_lowercase_wallets` BEFORE UPDATE ON `tickets` FOR EACH ROW BEGIN
  SET NEW.owner_wallet_address = LOWER(TRIM(NEW.owner_wallet_address));
  IF NEW.contract_address IS NOT NULL THEN
    SET NEW.contract_address = LOWER(TRIM(NEW.contract_address));
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ticket_checkins`
--

CREATE TABLE `ticket_checkins` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_code_snapshot` varchar(80) NOT NULL,
  `checkin_method` enum('manual','qr') NOT NULL DEFAULT 'manual',
  `scanned_value` varchar(500) NOT NULL,
  `result` enum('success','failed') NOT NULL,
  `failure_reason` text DEFAULT NULL,
  `checked_in_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ticket_listings`
--

CREATE TABLE `ticket_listings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `listing_code` varchar(50) NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `seller_user_id` bigint(20) UNSIGNED NOT NULL,
  `seller_wallet_address` char(42) NOT NULL,
  `buyer_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `buyer_wallet_address` char(42) DEFAULT NULL,
  `original_price` decimal(12,2) NOT NULL,
  `asking_price` decimal(12,2) NOT NULL,
  `status` enum('active','pending_payment','waiting_admin','sold','cancelled','rejected','expired') NOT NULL DEFAULT 'active',
  `transfer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `listed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `buyer_selected_at` datetime DEFAULT NULL,
  `sold_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `ticket_listings`
--

INSERT INTO `ticket_listings` (`id`, `listing_code`, `ticket_id`, `seller_user_id`, `seller_wallet_address`, `buyer_user_id`, `buyer_wallet_address`, `original_price`, `asking_price`, `status`, `transfer_id`, `admin_id`, `admin_note`, `listed_at`, `buyer_selected_at`, `sold_at`, `cancelled_at`, `rejected_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(1, 'LST202604250006249759', 15, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 500000.00, 'sold', 6, 2, 'Admin xác nhận giao dịch marketplace', '2026-04-25 00:06:24', '2026-04-25 00:12:27', '2026-04-25 20:45:12', NULL, NULL, '2026-05-02 00:06:24', '2026-04-25 00:06:24', '2026-04-25 20:45:12'),
(2, 'LST202604252023416218', 23, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', NULL, NULL, 1500000.00, 1500000.00, 'active', NULL, NULL, NULL, '2026-04-25 20:23:41', NULL, NULL, NULL, NULL, '2026-05-02 20:23:41', '2026-04-25 20:23:41', '2026-04-25 20:23:41'),
(3, 'LST202604252023463003', 22, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', NULL, NULL, 1500000.00, 1500000.00, 'active', NULL, NULL, NULL, '2026-04-25 20:23:46', NULL, NULL, NULL, NULL, '2026-05-02 20:23:46', '2026-04-25 20:23:46', '2026-04-25 20:23:46'),
(4, 'LST202604252027136267', 21, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 400000.00, 'sold', 8, 2, 'Admin xác nhận giao dịch marketplace', '2026-04-25 20:27:13', '2026-04-25 20:27:45', '2026-04-25 20:45:10', NULL, NULL, '2026-05-02 20:27:13', '2026-04-25 20:27:13', '2026-04-25 20:45:10');

--
-- Bẫy `ticket_listings`
--
DELIMITER $$
CREATE TRIGGER `trg_ticket_listings_bi_lowercase_wallets` BEFORE INSERT ON `ticket_listings` FOR EACH ROW BEGIN
  SET NEW.seller_wallet_address = LOWER(TRIM(NEW.seller_wallet_address));

  IF NEW.buyer_wallet_address IS NOT NULL THEN
    SET NEW.buyer_wallet_address = LOWER(TRIM(NEW.buyer_wallet_address));
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_ticket_listings_bu_lowercase_wallets` BEFORE UPDATE ON `ticket_listings` FOR EACH ROW BEGIN
  SET NEW.seller_wallet_address = LOWER(TRIM(NEW.seller_wallet_address));

  IF NEW.buyer_wallet_address IS NOT NULL THEN
    SET NEW.buyer_wallet_address = LOWER(TRIM(NEW.buyer_wallet_address));
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ticket_transfers`
--

CREATE TABLE `ticket_transfers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `from_user_id` bigint(20) UNSIGNED NOT NULL,
  `from_wallet_address` char(42) NOT NULL,
  `to_user_id` bigint(20) UNSIGNED NOT NULL,
  `to_wallet_address` char(42) NOT NULL,
  `requested_by_user_id` bigint(20) UNSIGNED NOT NULL,
  `transfer_type` enum('gift','resale_private') NOT NULL DEFAULT 'gift',
  `asking_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('not_required','pending','paid','failed','cancelled') NOT NULL DEFAULT 'not_required',
  `approved_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transfer_tx_hash` char(66) DEFAULT NULL,
  `status` enum('pending','approved','completed','rejected','failed','cancelled') NOT NULL DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `accepted_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `transferred_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `ticket_transfers`
--

INSERT INTO `ticket_transfers` (`id`, `ticket_id`, `from_user_id`, `from_wallet_address`, `to_user_id`, `to_wallet_address`, `requested_by_user_id`, `transfer_type`, `asking_price`, `payment_status`, `approved_by_admin_id`, `transfer_tx_hash`, `status`, `admin_note`, `failure_reason`, `requested_at`, `accepted_at`, `expires_at`, `approved_at`, `rejected_at`, `failed_at`, `cancelled_at`, `transferred_at`, `created_at`, `updated_at`) VALUES
(1, 1, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 4, '0xb0a566f3f0ec8f57e362e3e0fd0e16417c1a5f8e', 3, 'gift', 0.00, 'not_required', NULL, NULL, 'cancelled', 'Chuyển vé cho bạn tôi', NULL, '2026-04-11 00:55:39', NULL, NULL, NULL, NULL, NULL, '2026-04-24 09:29:19', NULL, '2026-04-11 00:55:39', '2026-04-24 09:29:19'),
(2, 12, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 5, 'gift', 0.00, 'not_required', NULL, NULL, 'completed', 'aa', NULL, '2026-04-24 09:25:05', '2026-04-24 09:26:47', NULL, NULL, NULL, NULL, NULL, '2026-04-24 09:26:47', '2026-04-24 09:25:05', '2026-04-24 09:26:47'),
(3, 1, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 3, 'resale_private', 500000.00, 'paid', NULL, NULL, 'completed', 'aa', NULL, '2026-04-24 09:29:45', '2026-04-24 09:30:36', '2026-04-24 10:29:45', NULL, NULL, NULL, NULL, '2026-04-24 09:30:36', '2026-04-24 09:29:45', '2026-04-24 09:30:36'),
(4, 13, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 4, '0xb0a566f3f0ec8f57e362e3e0fd0e16417c1a5f8e', 6, 'gift', 0.00, 'not_required', NULL, NULL, 'cancelled', 'iu', NULL, '2026-04-24 21:58:08', NULL, NULL, NULL, NULL, NULL, '2026-04-25 20:10:47', NULL, '2026-04-24 21:58:08', '2026-04-25 20:10:47'),
(5, 14, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 6, 'gift', 0.00, 'not_required', NULL, NULL, 'cancelled', 'Tặng vé cho bạn', NULL, '2026-04-24 23:51:47', NULL, NULL, NULL, NULL, NULL, '2026-04-25 20:10:49', NULL, '2026-04-24 23:51:47', '2026-04-25 20:10:49'),
(6, 15, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 3, 'resale_private', 500000.00, 'paid', 2, NULL, 'completed', 'Admin xác nhận giao dịch marketplace', NULL, '2026-04-25 00:12:27', '2026-04-25 00:12:27', NULL, '2026-04-25 20:45:12', NULL, NULL, NULL, '2026-04-25 20:45:12', '2026-04-25 00:12:27', '2026-04-25 20:45:12'),
(7, 13, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 4, '0xb0a566f3f0ec8f57e362e3e0fd0e16417c1a5f8e', 6, 'resale_private', 1000000.00, 'pending', NULL, NULL, 'pending', NULL, NULL, '2026-04-25 20:11:12', NULL, '2026-04-25 21:11:12', NULL, NULL, NULL, NULL, NULL, '2026-04-25 20:11:12', '2026-04-25 20:11:12'),
(8, 21, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 3, 'resale_private', 400000.00, 'paid', 2, NULL, 'completed', 'Admin xác nhận giao dịch marketplace', NULL, '2026-04-25 20:27:45', '2026-04-25 20:27:45', NULL, '2026-04-25 20:45:09', NULL, NULL, NULL, '2026-04-25 20:45:09', '2026-04-25 20:27:45', '2026-04-25 20:45:09');

--
-- Bẫy `ticket_transfers`
--
DELIMITER $$
CREATE TRIGGER `trg_ticket_transfers_bi_lowercase_wallets` BEFORE INSERT ON `ticket_transfers` FOR EACH ROW BEGIN
  SET NEW.from_wallet_address = LOWER(TRIM(NEW.from_wallet_address));
  SET NEW.to_wallet_address = LOWER(TRIM(NEW.to_wallet_address));
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_ticket_transfers_bu_lowercase_wallets` BEFORE UPDATE ON `ticket_transfers` FOR EACH ROW BEGIN
  SET NEW.from_wallet_address = LOWER(TRIM(NEW.from_wallet_address));
  SET NEW.to_wallet_address = LOWER(TRIM(NEW.to_wallet_address));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ticket_transfer_payments`
--

CREATE TABLE `ticket_transfer_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `transfer_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `seller_user_id` bigint(20) UNSIGNED NOT NULL,
  `buyer_user_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `payment_method` enum('demo','metamask','bank_transfer','cash','stripe') NOT NULL DEFAULT 'demo',
  `gateway_transaction_id` varchar(100) DEFAULT NULL,
  `blockchain_tx_hash` char(66) DEFAULT NULL,
  `payer_wallet_address` char(42) DEFAULT NULL,
  `status` enum('success','failed','cancelled') NOT NULL DEFAULT 'success',
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `ticket_transfer_payments`
--

INSERT INTO `ticket_transfer_payments` (`id`, `transfer_id`, `ticket_id`, `seller_user_id`, `buyer_user_id`, `amount`, `currency`, `payment_method`, `gateway_transaction_id`, `blockchain_tx_hash`, `payer_wallet_address`, `status`, `paid_at`, `created_at`, `updated_at`) VALUES
(1, 3, 1, 3, 5, 500000.00, 'VND', 'metamask', NULL, NULL, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'success', '2026-04-24 09:30:36', '2026-04-24 09:30:36', '2026-04-24 09:30:36'),
(2, 6, 15, 6, 3, 500000.00, 'VND', 'demo', NULL, NULL, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 'success', '2026-04-25 00:12:27', '2026-04-25 00:12:27', '2026-04-25 00:12:27'),
(3, 8, 21, 6, 3, 400000.00, 'VND', 'demo', NULL, NULL, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 'success', '2026-04-25 20:27:45', '2026-04-25 20:27:45', '2026-04-25 20:27:45');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ticket_types`
--

CREATE TABLE `ticket_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `quantity_total` int(10) UNSIGNED NOT NULL,
  `quantity_sold` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `max_per_order` int(10) UNSIGNED NOT NULL DEFAULT 10,
  `sale_start` datetime DEFAULT NULL,
  `sale_end` datetime DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `ticket_types`
--

INSERT INTO `ticket_types` (`id`, `event_id`, `name`, `description`, `price`, `quantity_total`, `quantity_sold`, `max_per_order`, `sale_start`, `sale_end`, `status`, `created_at`, `updated_at`) VALUES
(2, 1, 'VIP', 'Ve VIP test', 1500000.00, 100, 48, 4, '2026-04-01 09:00:00', '2026-12-19 23:59:59', 'active', '2026-04-10 13:15:53', '2026-04-25 22:29:25');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `status` enum('active','inactive','banned') NOT NULL DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `role`, `status`, `last_login_at`, `created_at`, `updated_at`) VALUES
(2, 'Admin VeVuiVe', 'adminvevuive@gmail.com', '0911111111', '$2b$10$GACuCuR0xDCFLiITK.ND.Oo2qCw6F/f3RuFSk6p/E7vTUwj48gVze', 'admin', 'active', '2026-04-25 22:31:01', '2026-04-10 12:19:41', '2026-04-25 22:31:01'),
(3, 'Customer VeVuiVe', 'testvevuive@gmail.com', '0922222222', '$2b$10$zOt77EUINvfBf..W06LN2e8t.hIQy8NIMVuBBrTEeqbRYF1B0ApV.', 'customer', 'active', '2026-04-25 20:27:38', '2026-04-10 12:19:46', '2026-04-25 20:27:38'),
(4, 'Receiver VeVuiVe', 'receivervevuive@gmail.com', '0933333333', '$2b$10$UXEbKbJBVUeyLAx.iydA8uoho6p9WAbhS93iFUbRVfuQaatcQAAOi', 'customer', 'active', '2026-04-11 00:53:32', '2026-04-11 00:53:14', '2026-04-11 00:53:32'),
(5, 'Đặng Đức Trí', 'ductrihth93@gmail.com', '0376879420', '$2b$10$XEG8M.mN6H1xwct.z5OadOP.AaxynHZAdwdslqApnzFO7nPfCxW9a', 'customer', 'active', '2026-04-24 09:30:04', '2026-04-23 23:53:28', '2026-04-24 09:30:04'),
(6, 'Lê Thanh Nguyên', 'nguyen1@gmail.com', '0354331794', '$2b$10$mNCdad5D8Q6piF5g8DIOw.LHBsFxzKffDV/u9hh9QtZN3irTci5ri', 'customer', 'active', '2026-04-25 22:28:00', '2026-04-24 21:54:39', '2026-04-25 22:28:00');

--
-- Bẫy `users`
--
DELIMITER $$
CREATE TRIGGER `trg_users_bi_lowercase_email` BEFORE INSERT ON `users` FOR EACH ROW BEGIN
  SET NEW.email = LOWER(TRIM(NEW.email));
  SET NEW.phone = TRIM(NEW.phone);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_users_bu_lowercase_email` BEFORE UPDATE ON `users` FOR EACH ROW BEGIN
  SET NEW.email = LOWER(TRIM(NEW.email));
  SET NEW.phone = TRIM(NEW.phone);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_balances`
--

CREATE TABLE `user_balances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `user_balances`
--

INSERT INTO `user_balances` (`id`, `user_id`, `balance`, `currency`, `created_at`, `updated_at`) VALUES
(1, 3, 100000.00, 'VND', '2026-04-24 22:59:33', '2026-04-25 20:27:45'),
(2, 4, 0.00, 'VND', '2026-04-24 22:59:33', '2026-04-24 22:59:33'),
(3, 5, 10000000.00, 'VND', '2026-04-24 22:59:33', '2026-04-24 23:36:52'),
(4, 6, 84400000.00, 'VND', '2026-04-24 22:59:33', '2026-04-25 22:29:27'),
(65, 2, 0.00, 'VND', '2026-04-25 21:27:23', '2026-04-25 21:27:23');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `wallets`
--

CREATE TABLE `wallets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `wallet_address` char(42) NOT NULL,
  `wallet_type` enum('metamask','walletconnect','other') NOT NULL DEFAULT 'metamask',
  `network_name` varchar(50) NOT NULL DEFAULT 'sepolia',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `linked_at` datetime NOT NULL DEFAULT current_timestamp(),
  `verified_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `wallets`
--

INSERT INTO `wallets` (`id`, `user_id`, `wallet_address`, `wallet_type`, `network_name`, `is_verified`, `linked_at`, `verified_at`, `updated_at`) VALUES
(2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 'metamask', 'sepolia', 0, '2026-04-10 13:10:18', NULL, '2026-04-10 13:10:18'),
(3, 4, '0xb0a566f3f0ec8f57e362e3e0fd0e16417c1a5f8e', 'metamask', 'sepolia', 0, '2026-04-11 00:54:23', NULL, '2026-04-11 00:54:23'),
(4, 5, '0x438477d308b67b22b2cb1dd4b3fda0e3afa60ebe', 'metamask', 'sepolia', 0, '2026-04-23 23:54:28', NULL, '2026-04-23 23:54:42'),
(5, 6, '0xd87ceb26c56a6e14a418330fa202ab5c6db62f2c', 'metamask', 'sepolia', 0, '2026-04-24 21:56:17', NULL, '2026-04-24 21:56:17');

--
-- Bẫy `wallets`
--
DELIMITER $$
CREATE TRIGGER `trg_wallets_bi_lowercase_address` BEFORE INSERT ON `wallets` FOR EACH ROW BEGIN
  SET NEW.wallet_address = LOWER(TRIM(NEW.wallet_address));
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_wallets_bu_lowercase_address` BEFORE UPDATE ON `wallets` FOR EACH ROW BEGIN
  SET NEW.wallet_address = LOWER(TRIM(NEW.wallet_address));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `wallet_topup_requests`
--

CREATE TABLE `wallet_topup_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `topup_code` varchar(50) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `payment_method` enum('bank_transfer','qr_transfer','cash','demo') NOT NULL DEFAULT 'qr_transfer',
  `transfer_content` varchar(255) NOT NULL,
  `payment_note` text DEFAULT NULL,
  `proof_image_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','paid_submitted','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `wallet_transaction_id` bigint(20) UNSIGNED DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `submitted_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `wallet_topup_requests`
--

INSERT INTO `wallet_topup_requests` (`id`, `topup_code`, `user_id`, `amount`, `currency`, `payment_method`, `transfer_content`, `payment_note`, `proof_image_url`, `status`, `admin_id`, `admin_note`, `wallet_transaction_id`, `requested_at`, `submitted_at`, `approved_at`, `rejected_at`, `cancelled_at`, `created_at`, `updated_at`) VALUES
(1, 'TOPUP202604252127367532', 2, 500000.00, 'VND', 'qr_transfer', 'TOPUP202604252127367532', 'Đã thanh toán theo nội dung chuyển khoản', NULL, 'paid_submitted', NULL, NULL, NULL, '2026-04-25 21:27:36', '2026-04-25 21:39:42', NULL, NULL, NULL, '2026-04-25 21:27:36', '2026-04-25 21:39:42');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `wallet_transactions`
--

CREATE TABLE `wallet_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `transaction_code` varchar(50) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `transaction_type` enum('topup','purchase_ticket','transfer_purchase','transfer_receive','refund','admin_adjustment') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance_before` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `reference_type` enum('order','ticket_transfer','marketplace_listing','manual') NOT NULL DEFAULT 'manual',
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('pending','success','failed','cancelled') NOT NULL DEFAULT 'success',
  `note` text DEFAULT NULL,
  `created_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `wallet_transactions`
--

INSERT INTO `wallet_transactions` (`id`, `transaction_code`, `user_id`, `transaction_type`, `amount`, `balance_before`, `balance_after`, `currency`, `reference_type`, `reference_id`, `status`, `note`, `created_by_admin_id`, `created_at`) VALUES
(1, 'WTX20260424233652810255', 5, 'topup', 10000000.00, 0.00, 10000000.00, 'VND', 'manual', NULL, 'success', 'Nạp tiền demo cho user mua vé', 2, '2026-04-24 23:36:52'),
(2, 'WTX20260424233723769846', 6, 'topup', 100000000.00, 0.00, 100000000.00, 'VND', 'manual', NULL, 'success', 'Nạp tiền demo cho user mua vé', 2, '2026-04-24 23:37:23'),
(3, 'WTX20260424234213780684', 6, 'purchase_ticket', 1500000.00, 100000000.00, 98500000.00, 'VND', 'order', 18, 'success', 'Thanh toán đơn hàng ORD202604242341363501', NULL, '2026-04-24 23:42:13'),
(4, 'WTX20260425000559929763', 6, 'purchase_ticket', 1500000.00, 98500000.00, 97000000.00, 'VND', 'order', 19, 'success', 'Thanh toán đơn hàng ORD202604250004131865', NULL, '2026-04-25 00:05:59'),
(5, 'WTX20260425000848625389', 3, 'topup', 1000000.00, 0.00, 1000000.00, 'VND', 'manual', NULL, 'success', 'Nạp tiền demo để mua vé trên sàn', 2, '2026-04-25 00:08:48'),
(6, 'WTX20260425001227748227', 3, 'transfer_purchase', 500000.00, 1000000.00, 500000.00, 'VND', 'marketplace_listing', 1, 'success', 'Mua vé trên sàn LST202604250006249759', NULL, '2026-04-25 00:12:27'),
(7, 'WTX20260425200730715964', 6, 'purchase_ticket', 1500000.00, 97000000.00, 95500000.00, 'VND', 'order', 20, 'success', 'Thanh toán đơn hàng ORD202604252007124448', NULL, '2026-04-25 20:07:30'),
(8, 'WTX20260425201225867685', 6, 'purchase_ticket', 3000000.00, 95500000.00, 92500000.00, 'VND', 'order', 21, 'success', 'Thanh toán đơn hàng ORD202604252012239685', NULL, '2026-04-25 20:12:25'),
(9, 'WTX20260425201341337664', 6, 'purchase_ticket', 3000000.00, 92500000.00, 89500000.00, 'VND', 'order', 22, 'success', 'Thanh toán đơn hàng ORD202604252013375792', NULL, '2026-04-25 20:13:41'),
(10, 'WTX20260425201558776906', 6, 'purchase_ticket', 4500000.00, 89500000.00, 85000000.00, 'VND', 'order', 23, 'success', 'Thanh toán đơn hàng ORD202604252015545046', NULL, '2026-04-25 20:15:58'),
(11, 'WTX20260425202745382213', 3, 'transfer_purchase', 400000.00, 500000.00, 100000.00, 'VND', 'marketplace_listing', 4, 'success', 'Mua vé trên sàn LST202604252027136267', NULL, '2026-04-25 20:27:45'),
(12, 'WTX20260425204509190203', 6, 'transfer_receive', 400000.00, 85000000.00, 85400000.00, 'VND', 'marketplace_listing', 4, 'success', 'Nhận tiền bán vé trên sàn LST202604252027136267', 2, '2026-04-25 20:45:09'),
(13, 'WTX20260425204512675536', 6, 'transfer_receive', 500000.00, 85400000.00, 85900000.00, 'VND', 'marketplace_listing', 1, 'success', 'Nhận tiền bán vé trên sàn LST202604250006249759', 2, '2026-04-25 20:45:12'),
(14, 'WTX20260425222927620777', 6, 'purchase_ticket', 1500000.00, 85900000.00, 84400000.00, 'VND', 'order', 24, 'success', 'Thanh toán đơn hàng ORD202604252229253853', NULL, '2026-04-25 22:29:27');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_events_slug` (`slug`),
  ADD KEY `idx_events_status` (`status`),
  ADD KEY `idx_events_event_date` (`event_date`),
  ADD KEY `fk_events_created_by` (`created_by`);

--
-- Chỉ mục cho bảng `event_questions`
--
ALTER TABLE `event_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_questions_event_id` (`event_id`);

--
-- Chỉ mục cho bảng `event_question_options`
--
ALTER TABLE `event_question_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_question_options_question_id` (`question_id`);

--
-- Chỉ mục cho bảng `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_orders_order_code` (`order_code`),
  ADD KEY `idx_orders_user_id` (`user_id`),
  ADD KEY `idx_orders_payment_status` (`payment_status`),
  ADD KEY `idx_orders_order_status` (`order_status`);

--
-- Chỉ mục cho bảng `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order_id` (`order_id`),
  ADD KEY `idx_order_items_ticket_type_id` (`ticket_type_id`);

--
-- Chỉ mục cho bảng `order_question_answers`
--
ALTER TABLE `order_question_answers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_question_answers_order_id` (`order_id`),
  ADD KEY `idx_order_question_answers_question_id` (`question_id`);

--
-- Chỉ mục cho bảng `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payments_payment_code` (`payment_code`),
  ADD KEY `idx_payments_order_id` (`order_id`),
  ADD KEY `idx_payments_status` (`status`);

--
-- Chỉ mục cho bảng `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tickets_ticket_code` (`ticket_code`),
  ADD UNIQUE KEY `uq_tickets_blockchain_ticket_id` (`blockchain_ticket_id`),
  ADD KEY `idx_tickets_order_id` (`order_id`),
  ADD KEY `idx_tickets_order_item_id` (`order_item_id`),
  ADD KEY `idx_tickets_event_id` (`event_id`),
  ADD KEY `idx_tickets_ticket_type_id` (`ticket_type_id`),
  ADD KEY `idx_tickets_owner_user_id` (`owner_user_id`),
  ADD KEY `idx_tickets_ticket_status` (`ticket_status`),
  ADD KEY `idx_tickets_mint_status` (`mint_status`);

--
-- Chỉ mục cho bảng `ticket_checkins`
--
ALTER TABLE `ticket_checkins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket_checkins_ticket_id` (`ticket_id`),
  ADD KEY `idx_ticket_checkins_event_id` (`event_id`),
  ADD KEY `idx_ticket_checkins_admin_id` (`admin_id`),
  ADD KEY `idx_ticket_checkins_result` (`result`),
  ADD KEY `idx_ticket_checkins_checked_in_at` (`checked_in_at`);

--
-- Chỉ mục cho bảng `ticket_listings`
--
ALTER TABLE `ticket_listings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ticket_listings_code` (`listing_code`),
  ADD KEY `idx_ticket_listings_ticket_id` (`ticket_id`),
  ADD KEY `idx_ticket_listings_seller_user_id` (`seller_user_id`),
  ADD KEY `idx_ticket_listings_buyer_user_id` (`buyer_user_id`),
  ADD KEY `idx_ticket_listings_status` (`status`),
  ADD KEY `idx_ticket_listings_transfer_id` (`transfer_id`),
  ADD KEY `idx_ticket_listings_admin_id` (`admin_id`);

--
-- Chỉ mục cho bảng `ticket_transfers`
--
ALTER TABLE `ticket_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket_transfers_ticket_id` (`ticket_id`),
  ADD KEY `idx_ticket_transfers_from_user_id` (`from_user_id`),
  ADD KEY `idx_ticket_transfers_to_user_id` (`to_user_id`),
  ADD KEY `idx_ticket_transfers_requested_by` (`requested_by_user_id`),
  ADD KEY `idx_ticket_transfers_approved_by` (`approved_by_admin_id`),
  ADD KEY `idx_ticket_transfers_status` (`status`);

--
-- Chỉ mục cho bảng `ticket_transfer_payments`
--
ALTER TABLE `ticket_transfer_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ttp_transfer_id` (`transfer_id`),
  ADD KEY `idx_ttp_ticket_id` (`ticket_id`),
  ADD KEY `idx_ttp_seller_user_id` (`seller_user_id`),
  ADD KEY `idx_ttp_buyer_user_id` (`buyer_user_id`);

--
-- Chỉ mục cho bảng `ticket_types`
--
ALTER TABLE `ticket_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ticket_types_event_name` (`event_id`,`name`),
  ADD KEY `idx_ticket_types_event_id` (`event_id`),
  ADD KEY `idx_ticket_types_status` (`status`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD UNIQUE KEY `uq_users_phone` (`phone`);

--
-- Chỉ mục cho bảng `user_balances`
--
ALTER TABLE `user_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_balances_user_id` (`user_id`);

--
-- Chỉ mục cho bảng `wallets`
--
ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wallets_user_id` (`user_id`),
  ADD UNIQUE KEY `uq_wallets_wallet_address` (`wallet_address`);

--
-- Chỉ mục cho bảng `wallet_topup_requests`
--
ALTER TABLE `wallet_topup_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wallet_topup_requests_code` (`topup_code`),
  ADD KEY `idx_wallet_topup_requests_user_id` (`user_id`),
  ADD KEY `idx_wallet_topup_requests_status` (`status`),
  ADD KEY `idx_wallet_topup_requests_admin_id` (`admin_id`),
  ADD KEY `idx_wallet_topup_requests_wallet_transaction_id` (`wallet_transaction_id`);

--
-- Chỉ mục cho bảng `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wallet_transactions_code` (`transaction_code`),
  ADD KEY `idx_wallet_transactions_user_id` (`user_id`),
  ADD KEY `idx_wallet_transactions_type` (`transaction_type`),
  ADD KEY `idx_wallet_transactions_reference` (`reference_type`,`reference_id`),
  ADD KEY `idx_wallet_transactions_admin` (`created_by_admin_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `events`
--
ALTER TABLE `events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `event_questions`
--
ALTER TABLE `event_questions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `event_question_options`
--
ALTER TABLE `event_question_options`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT cho bảng `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT cho bảng `order_question_answers`
--
ALTER TABLE `order_question_answers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT cho bảng `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT cho bảng `ticket_checkins`
--
ALTER TABLE `ticket_checkins`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ticket_listings`
--
ALTER TABLE `ticket_listings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `ticket_transfers`
--
ALTER TABLE `ticket_transfers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `ticket_transfer_payments`
--
ALTER TABLE `ticket_transfer_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `ticket_types`
--
ALTER TABLE `ticket_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `user_balances`
--
ALTER TABLE `user_balances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT cho bảng `wallets`
--
ALTER TABLE `wallets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `wallet_topup_requests`
--
ALTER TABLE `wallet_topup_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `event_questions`
--
ALTER TABLE `event_questions`
  ADD CONSTRAINT `fk_event_questions_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `event_question_options`
--
ALTER TABLE `event_question_options`
  ADD CONSTRAINT `fk_event_question_options_question` FOREIGN KEY (`question_id`) REFERENCES `event_questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_items_ticket_type` FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types` (`id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `order_question_answers`
--
ALTER TABLE `order_question_answers`
  ADD CONSTRAINT `fk_order_question_answers_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_question_answers_question` FOREIGN KEY (`question_id`) REFERENCES `event_questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `fk_tickets_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tickets_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tickets_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tickets_owner_user` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tickets_ticket_type` FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types` (`id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ticket_checkins`
--
ALTER TABLE `ticket_checkins`
  ADD CONSTRAINT `fk_ticket_checkins_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_checkins_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_checkins_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ticket_listings`
--
ALTER TABLE `ticket_listings`
  ADD CONSTRAINT `fk_ticket_listings_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_listings_buyer` FOREIGN KEY (`buyer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_listings_seller` FOREIGN KEY (`seller_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_listings_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_listings_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `ticket_transfers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ticket_transfers`
--
ALTER TABLE `ticket_transfers`
  ADD CONSTRAINT `fk_ticket_transfers_approved_by` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ticket_transfer_payments`
--
ALTER TABLE `ticket_transfer_payments`
  ADD CONSTRAINT `fk_ttp_buyer` FOREIGN KEY (`buyer_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ttp_seller` FOREIGN KEY (`seller_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ttp_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ttp_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `ticket_transfers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ticket_types`
--
ALTER TABLE `ticket_types`
  ADD CONSTRAINT `fk_ticket_types_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `user_balances`
--
ALTER TABLE `user_balances`
  ADD CONSTRAINT `fk_user_balances_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `wallets`
--
ALTER TABLE `wallets`
  ADD CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `wallet_topup_requests`
--
ALTER TABLE `wallet_topup_requests`
  ADD CONSTRAINT `fk_wallet_topup_requests_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallet_topup_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallet_topup_requests_wallet_transaction` FOREIGN KEY (`wallet_transaction_id`) REFERENCES `wallet_transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD CONSTRAINT `fk_wallet_transactions_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallet_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
