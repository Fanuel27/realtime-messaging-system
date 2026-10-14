const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../src/db');
const { createApp } = require('../src/app');

describe('Authentication API', () => {
  let app;

  before(() => {
    // Use in-memory SQLite database for test isolation
    db.initDb(':memory:');
    app = createApp();
  });

  it('should successfully register a new user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.username, 'alice');
    assert.equal(res.body.user.email, 'alice@example.com');
    assert.ok(res.body.user.id);
    assert.ok(res.body.token);
    assert.equal(res.body.user.password_hash, undefined); // password hash must never be exposed
  });

  it('should reject registration with duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice',
        email: 'different@example.com',
        password: 'password123',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /Username is already taken/i);
  });

  it('should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'another_alice',
        email: 'alice@example.com',
        password: 'password123',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /email already exists/i);
  });

  it('should reject registration with short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'charlie',
        email: 'charlie@example.com',
        password: '123',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least 6 characters/i);
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'david',
        email: 'invalid-email',
        password: 'password123',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid email address/i);
  });

  it('should successfully log in an existing user with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'password123',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, 'alice');
    assert.ok(res.body.token);
  });

  it('should reject login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'wrongpassword',
      });

    assert.equal(res.status, 401);
    assert.match(res.body.error, /Invalid email or password/i);
  });

  it('should reject login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

    assert.equal(res.status, 401);
    assert.match(res.body.error, /Invalid email or password/i);
  });

  it('should reject access to protected endpoint without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.match(res.body.error, /Authentication required/i);
  });

  it('should allow access to protected endpoint with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'password123',
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.username, 'alice');
  });
});
