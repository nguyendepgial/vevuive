-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th4 10, 2026 lúc 08:06 PM
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
) ;

--
-- Đang đổ dữ liệu cho bảng `orders`
--

INSERT INTO `orders` (`id`, `order_code`, `user_id`, `total_amount`, `payment_status`, `order_status`, `payment_method`, `notes`, `expires_at`, `cancelled_at`, `cancel_reason`, `created_at`, `updated_at`) VALUES
(1, 'ORD202604101325509301', 3, 3000000.00, 'pending', 'awaiting_payment', 'demo', 'Đặt vé test', '2026-04-10 13:40:50', '2026-04-10 13:26:53', 'Đổi kế hoạch', '2026-04-10 13:25:50', '2026-04-10 13:44:11'),
(2, 'ORD202604101344434487', 3, 3000000.00, 'paid', 'completed', 'metamask', 'Đặt vé test payment', '2026-04-10 13:59:43', NULL, NULL, '2026-04-10 13:44:43', '2026-04-10 13:59:53');

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
) ;

--
-- Đang đổ dữ liệu cho bảng `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `ticket_type_id`, `ticket_type_name_snapshot`, `unit_price`, `quantity`, `created_at`) VALUES
(1, 1, 2, 'VIP', 1500000.00, 2, '2026-04-10 13:25:50'),
(2, 2, 2, 'VIP', 1500000.00, 2, '2026-04-10 13:44:43');

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
) ;

--
-- Đang đổ dữ liệu cho bảng `payments`
--

INSERT INTO `payments` (`id`, `payment_code`, `order_id`, `payment_method`, `amount`, `currency`, `gateway_transaction_id`, `blockchain_tx_hash`, `payer_wallet_address`, `status`, `paid_at`, `gateway_response`, `created_at`, `updated_at`) VALUES
(1, 'PAY202604101345085855', 2, 'metamask', 3000000.00, 'VND', NULL, '0x1111111111111111111111111111111111111111111111111111111111111111', '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 'success', '2026-04-10 13:45:08', NULL, '2026-04-10 13:45:08', '2026-04-10 13:45:08');

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
) ;

--
-- Đang đổ dữ liệu cho bảng `tickets`
--

INSERT INTO `tickets` (`id`, `ticket_code`, `order_id`, `order_item_id`, `event_id`, `ticket_type_id`, `owner_user_id`, `owner_wallet_address`, `unit_price`, `ticket_status`, `blockchain_ticket_id`, `contract_address`, `mint_tx_hash`, `metadata_uri`, `mint_status`, `minted_at`, `transferred_count`, `last_transfer_at`, `created_at`, `updated_at`) VALUES
(1, 'TCK202604101359537729', 2, 2, 1, 2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 'active', '1', '0x38c99df26a06ab4da9d0a00570f06b3c5938fcf8', '0xb7691d80c0601290db87ee02152c4a6391b1d3f43fc4b2b1a118fc8ba93a6cb7', 'http://localhost:5001/api/users/tickets/1', 'minted', '2026-04-11 00:07:40', 0, NULL, '2026-04-10 13:59:53', '2026-04-11 00:07:40'),
(2, 'TCK202604101359533301', 2, 2, 1, 2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 1500000.00, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, '2026-04-10 13:59:53', '2026-04-10 13:59:53');

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
  `approved_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transfer_tx_hash` char(66) DEFAULT NULL,
  `status` enum('pending','approved','completed','rejected','failed','cancelled') NOT NULL DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `transferred_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Đang đổ dữ liệu cho bảng `ticket_transfers`
--

INSERT INTO `ticket_transfers` (`id`, `ticket_id`, `from_user_id`, `from_wallet_address`, `to_user_id`, `to_wallet_address`, `requested_by_user_id`, `approved_by_admin_id`, `transfer_tx_hash`, `status`, `admin_note`, `failure_reason`, `requested_at`, `approved_at`, `rejected_at`, `failed_at`, `cancelled_at`, `transferred_at`, `created_at`, `updated_at`) VALUES
(1, 1, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 4, '0xb0a566f3f0ec8f57e362e3e0fd0e16417c1a5f8e', 3, NULL, NULL, 'pending', 'Chuyển vé cho bạn tôi', NULL, '2026-04-11 00:55:39', NULL, NULL, NULL, NULL, NULL, '2026-04-11 00:55:39', '2026-04-11 00:55:39');

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
) ;

--
-- Đang đổ dữ liệu cho bảng `ticket_types`
--

INSERT INTO `ticket_types` (`id`, `event_id`, `name`, `description`, `price`, `quantity_total`, `quantity_sold`, `max_per_order`, `sale_start`, `sale_end`, `status`, `created_at`, `updated_at`) VALUES
(2, 1, 'VIP', 'Ve VIP test', 1500000.00, 100, 2, 4, '2026-04-01 09:00:00', '2026-12-19 23:59:59', 'active', '2026-04-10 13:15:53', '2026-04-10 13:44:43');

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
) ;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `role`, `status`, `last_login_at`, `created_at`, `updated_at`) VALUES
(2, 'Admin VeVuiVe', 'adminvevuive@gmail.com', '0911111111', '$2b$10$GACuCuR0xDCFLiITK.ND.Oo2qCw6F/f3RuFSk6p/E7vTUwj48gVze', 'admin', 'active', '2026-04-11 00:04:27', '2026-04-10 12:19:41', '2026-04-11 00:04:27'),
(3, 'Customer VeVuiVe', 'customervevuive@gmail.com', '0922222222', '$2b$10$zOt77EUINvfBf..W06LN2e8t.hIQy8NIMVuBBrTEeqbRYF1B0ApV.', 'customer', 'active', '2026-04-11 00:54:59', '2026-04-10 12:19:46', '2026-04-11 00:54:59'),
(4, 'Receiver VeVuiVe', 'receivervevuive@gmail.com', '0933333333', '$2b$10$UXEbKbJBVUeyLAx.iydA8uoho6p9WAbhS93iFUbRVfuQaatcQAAOi', 'customer', 'active', '2026-04-11 00:53:32', '2026-04-11 00:53:14', '2026-04-11 00:53:32');

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
) ;

--
-- Đang đổ dữ liệu cho bảng `wallets`
--

INSERT INTO `wallets` (`id`, `user_id`, `wallet_address`, `wallet_type`, `network_name`, `is_verified`, `linked_at`, `verified_at`, `updated_at`) VALUES
(2, 3, '0x1f18004d19fcd5e8f2b89ffb5178cb01b5146211', 'metamask', 'sepolia', 0, '2026-04-10 13:10:18', NULL, '2026-04-10 13:10:18'),
(3, 4, '0xb0a566f3f0ec8f57e362e3e0fd0e16417c1a5f8e', 'metamask', 'sepolia', 0, '2026-04-11 00:54:23', NULL, '2026-04-11 00:54:23');

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
-- Chỉ mục cho bảng `wallets`
--
ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wallets_user_id` (`user_id`),
  ADD UNIQUE KEY `uq_wallets_wallet_address` (`wallet_address`);

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `order_question_answers`
--
ALTER TABLE `order_question_answers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ticket_transfers`
--
ALTER TABLE `ticket_transfers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ticket_types`
--
ALTER TABLE `ticket_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `wallets`
--
ALTER TABLE `wallets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

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
-- Các ràng buộc cho bảng `ticket_transfers`
--
ALTER TABLE `ticket_transfers`
  ADD CONSTRAINT `fk_ticket_transfers_approved_by` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_transfers_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ticket_types`
--
ALTER TABLE `ticket_types`
  ADD CONSTRAINT `fk_ticket_types_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `wallets`
--
ALTER TABLE `wallets`
  ADD CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
