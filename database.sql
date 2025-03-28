-- Create the database
CREATE DATABASE IF NOT EXISTS rds_app;

-- Use the database
USE rds_app;

-- Create the items table
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Insert some sample data
INSERT INTO items (name, description) VALUES 
    ('Sample Item 1', 'This is a description for sample item 1'),
    ('Sample Item 2', 'This is a description for sample item 2');
