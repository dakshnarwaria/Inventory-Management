DROP DATABASE IF EXISTS stockpilot;

CREATE DATABASE stockpilot;

USE stockpilot;

-- ---------- TABLES ----------

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(150)
);

CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    address VARCHAR(150)
);

CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    address VARCHAR(150)
);

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    supplier_id INT NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price >= 0),
    selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price >= 0),
    stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    reorder_level INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('Pending','Received','Cancelled') NOT NULL DEFAULT 'Received',
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE purchase_items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    sale_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method ENUM('Cash','Card','UPI') NOT NULL DEFAULT 'Cash',
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ---------- INDEX ----------

CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_sale_date ON sales(sale_date);
CREATE INDEX idx_purchase_date ON purchases(purchase_date);

-- ---------- TRIGGERS ----------

DELIMITER //

CREATE TRIGGER before_sale_item
BEFORE INSERT ON sale_items
FOR EACH ROW
BEGIN
    DECLARE available INT;
    SELECT stock_qty INTO available
    FROM products WHERE product_id = NEW.product_id;
    IF available < NEW.quantity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
    END IF;
END//

CREATE TRIGGER after_sale_item
AFTER INSERT ON sale_items
FOR EACH ROW
BEGIN
    UPDATE products SET stock_qty = stock_qty - NEW.quantity
    WHERE product_id = NEW.product_id;

    UPDATE sales SET total_amount = total_amount + (NEW.quantity * NEW.unit_price)
    WHERE sale_id = NEW.sale_id;
END//

CREATE TRIGGER after_purchase_item
AFTER INSERT ON purchase_items
FOR EACH ROW
BEGIN
    UPDATE products SET stock_qty = stock_qty + NEW.quantity
    WHERE product_id = NEW.product_id;

    UPDATE purchases SET total_amount = total_amount + (NEW.quantity * NEW.unit_cost)
    WHERE purchase_id = NEW.purchase_id;
END//

-- ---------- STORED PROCEDURES ----------

CREATE PROCEDURE sell_product(IN p_customer INT, IN p_product INT, IN p_qty INT, IN p_payment VARCHAR(10))
BEGIN
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_sale INT;

    SELECT selling_price INTO v_price FROM products WHERE product_id = p_product;

    INSERT INTO sales (customer_id, sale_date, payment_method)
    VALUES (p_customer, CURDATE(), p_payment);
    SET v_sale = LAST_INSERT_ID();

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale, p_product, p_qty, v_price);
END//

CREATE PROCEDURE purchase_product(IN p_supplier INT, IN p_product INT, IN p_qty INT, IN p_cost DECIMAL(10,2))
BEGIN
    DECLARE v_purchase INT;

    INSERT INTO purchases (supplier_id, purchase_date)
    VALUES (p_supplier, CURDATE());
    SET v_purchase = LAST_INSERT_ID();

    INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost)
    VALUES (v_purchase, p_product, p_qty, p_cost);
END//

CREATE PROCEDURE update_selling_price(IN p_product INT, IN p_price DECIMAL(10,2))
BEGIN
    UPDATE products SET selling_price = p_price
    WHERE product_id = p_product;
END//

DELIMITER ;

-- ---------- SAMPLE DATA ----------

INSERT INTO categories (category_name, description) VALUES
('Electronics', 'Gadgets and accessories'),
('Stationery', 'Office and school supplies'),
('Grocery', 'Daily essentials');

INSERT INTO suppliers (name, email, phone, address) VALUES
('TechSource Pvt Ltd', 'sales@techsource.com', '9811111111', 'Jaipur'),
('PaperWorld', 'orders@paperworld.com', '9822222222', 'Delhi'),
('FreshMart Traders', 'hello@freshmart.com', '9833333333', 'Kota');

INSERT INTO customers (name, email, phone, address) VALUES
('Aarav Sharma', 'aarav@example.com', '9876543210', 'Jaipur'),
('Priya Verma', 'priya@example.com', '9123456780', 'Jaipur'),
('Rohan Meena', 'rohan@example.com', '9988776655', 'Ajmer'),
('Neha Gupta', 'neha@example.com', '9090909090', 'Kota');

-- Products start with 0 stock; purchases bring stock in
INSERT INTO products (sku, name, category_id, supplier_id, cost_price, selling_price, reorder_level) VALUES
('ELE-001', 'USB Cable', 1, 1, 80, 150, 15),
('ELE-002', 'Wireless Mouse', 1, 1, 300, 550, 10),
('STA-001', 'A4 Notebook', 2, 2, 25, 45, 30),
('STA-002', 'Gel Pen', 2, 2, 8, 15, 50),
('GRO-001', 'Basmati Rice 5kg', 3, 3, 350, 420, 10),
('GRO-002', 'Sunflower Oil 1L', 3, 3, 120, 160, 10);

-- Triggers update products.stock_qty and purchases.total_amount automatically
INSERT INTO purchases (supplier_id, purchase_date) VALUES
(1, CURDATE()),
(2, CURDATE()),
(3, CURDATE());

INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost) VALUES
(1, 1, 50, 80),
(1, 2, 30, 300),
(2, 3, 200, 25),
(2, 4, 100, 8),
(3, 5, 40, 350),
(3, 6, 8, 120);

-- Triggers reduce stock and update sales.total_amount automatically
INSERT INTO sales (customer_id, sale_date, payment_method) VALUES
(1, CURDATE(), 'UPI'),
(2, CURDATE(), 'Cash'),
(3, CURDATE(), 'Card');

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES
(1, 1, 5, 150),
(1, 3, 10, 45),
(2, 2, 2, 550),
(3, 6, 3, 160);

-- ---------- VIEWS ----------

CREATE VIEW low_stock_products AS
SELECT p.product_id, p.sku, p.name, c.category_name, s.name AS supplier,
       p.stock_qty, p.reorder_level
FROM products p
JOIN categories c ON p.category_id = c.category_id
JOIN suppliers s ON p.supplier_id = s.supplier_id
WHERE p.stock_qty <= p.reorder_level;

CREATE VIEW sales_summary AS
SELECT s.sale_id, c.name AS customer, s.sale_date, s.payment_method, s.total_amount
FROM sales s
JOIN customers c ON s.customer_id = c.customer_id;

-- ---------- TEST QUERIES ----------

-- SELECT * FROM low_stock_products;                    -- Sunflower Oil should show up
-- SELECT * FROM products;                              -- check stock_qty after purchases and sales
-- SELECT * FROM sales_summary;
-- CALL sell_product(4, 6, 50, 'Cash');                 -- fails: Insufficient stock
-- CALL sell_product(4, 1, 3, 'UPI');                   -- reduces USB Cable stock by 3
-- CALL purchase_product(3, 6, 40, 120);                -- restocks Sunflower Oil
-- SELECT c.category_name, SUM(p.stock_qty * p.cost_price) AS stock_value FROM products p JOIN categories c ON p.category_id = c.category_id GROUP BY c.category_name;
-- SELECT p.name, SUM(si.quantity) AS units_sold, SUM(si.quantity * si.unit_price) AS revenue FROM sale_items si JOIN products p ON si.product_id = p.product_id GROUP BY p.name ORDER BY revenue DESC;
