CREATE DATABASE IF NOT EXISTS griffy_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'griffy_user'@'localhost'
  IDENTIFIED BY 'troque_esta_senha';

GRANT ALL PRIVILEGES ON griffy_store.* TO 'griffy_user'@'localhost';
FLUSH PRIVILEGES;
