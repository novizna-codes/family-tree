-- Create database if not exists
CREATE DATABASE IF NOT EXISTS family_tree;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'family_tree_user'@'%' IDENTIFIED BY 'family_tree_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON family_tree.* TO 'family_tree_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;