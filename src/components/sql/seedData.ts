export const SEED_SQL = `
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS employees;
  DROP TABLE IF EXISTS customers;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS departments;

  CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    country VARCHAR(50),
    created_at DATE
  );

  CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(50),
    price NUMERIC(10, 2),
    stock INT
  );

  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    product_id INT REFERENCES products(id),
    quantity INT,
    order_date DATE,
    status VARCHAR(20)
  );

  CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    budget NUMERIC(12, 2)
  );

  CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department_id INT REFERENCES departments(id),
    salary NUMERIC(10, 2),
    hire_date DATE
  );

  INSERT INTO customers (name, email, country, created_at) VALUES
    ('Alice Johnson', 'alice@example.com', 'USA', '2022-01-15'),
    ('Bob Smith', 'bob@example.com', 'UK', '2022-03-22'),
    ('Carol White', 'carol@example.com', 'Canada', '2023-06-10'),
    ('David Lee', 'david@example.com', 'USA', '2023-08-05'),
    ('Eva Martinez', 'eva@example.com', 'Spain', '2024-01-30');

  INSERT INTO products (name, category, price, stock) VALUES
    ('Laptop Pro', 'Electronics', 1299.99, 50),
    ('Wireless Mouse', 'Electronics', 29.99, 200),
    ('SQL Mastery Book', 'Books', 49.99, 150),
    ('Standing Desk', 'Furniture', 499.99, 30),
    ('Noise Cancelling Headphones', 'Electronics', 199.99, 75);

  INSERT INTO orders (customer_id, product_id, quantity, order_date, status) VALUES
    (1, 1, 1, '2024-02-01', 'delivered'),
    (1, 2, 2, '2024-02-15', 'delivered'),
    (2, 3, 1, '2024-03-01', 'shipped'),
    (3, 5, 1, '2024-03-10', 'processing'),
    (4, 4, 1, '2024-03-20', 'delivered'),
    (5, 2, 3, '2024-04-01', 'shipped'),
    (2, 1, 1, '2024-04-10', 'processing');

  INSERT INTO departments (name, budget) VALUES
    ('Engineering', 500000.00),
    ('Marketing', 200000.00),
    ('Sales', 300000.00),
    ('HR', 150000.00);

  INSERT INTO employees (name, department_id, salary, hire_date) VALUES
    ('Alice Johnson', 1, 95000.00, '2020-03-01'),
    ('Bob Smith', 2, 72000.00, '2021-06-15'),
    ('Carol White', 1, 105000.00, '2019-11-20'),
    ('David Lee', 3, 68000.00, '2022-01-10'),
    ('Eva Martinez', 4, 61000.00, '2023-05-05'),
    ('Frank Chen', 1, 88000.00, '2021-09-30');
`;

export const AVAILABLE_TABLES = [
  { name: 'customers', columns: ['id', 'name', 'email', 'country', 'created_at'] },
  { name: 'products', columns: ['id', 'name', 'category', 'price', 'stock'] },
  { name: 'orders', columns: ['id', 'customer_id', 'product_id', 'quantity', 'order_date', 'status'] },
  { name: 'departments', columns: ['id', 'name', 'budget'] },
  { name: 'employees', columns: ['id', 'name', 'department_id', 'salary', 'hire_date'] },
] as const;
