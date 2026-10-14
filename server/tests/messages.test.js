const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../src/db');
const { createApp } = require('../src/app');

describe('Messages & Conversation API', () => {
  let app;
  let user1Token;
  let user2Token;
  let user3Token;
  let user1;
  let user2;
  let user3;

  before(async () => {
    // Isolated in-memory database
    db.initDb(':memory:');
    app = createApp();

    // Register User 1 (Alice)
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: 'password123' });
    user1 = res1.body.user;
    user1Token = res1.body.token;

    // Register User 2 (Bob)
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'password123' });
    user2 = res2.body.user;
    user2Token = res2.body.token;

    // Register User 3 (Charlie)
    const res3 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'charlie', email: 'charlie@test.com', password: 'password123' });
    user3 = res3.body.user;
    user3Token = res3.body.token;
  });

  it('should list all registered users excluding the current user', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.body.users), true);
    assert.equal(res.body.users.length, 2);

    const usernames = res.body.users.map((u) => u.username);
    assert.ok(usernames.includes('bob'));
    assert.ok(usernames.includes('charlie'));
    assert.ok(!usernames.includes('alice')); // Current user excluded
  });

  it('should reject unauthenticated access to users directory', async () => {
    const res = await request(app).get('/api/users');
    assert.equal(res.status, 401);
  });

  it('should reject unauthenticated access to messages', async () => {
    const res = await request(app).get(`/api/messages/${user2.id}`);
    assert.equal(res.status, 401);
  });

  it('should reject sending message without authentication', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ recipient_id: user2.id, content: 'Hello Bob' });
    assert.equal(res.status, 401);
  });

  it('should reject sending empty message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient_id: user2.id, content: '   ' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /cannot be empty/i);
  });

  it('should reject sending oversized message exceeding 2000 characters', async () => {
    const longMessage = 'A'.repeat(2001);
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient_id: user2.id, content: longMessage });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /exceeds maximum allowed length/i);
  });

  it('should reject sending message to non-existent user', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient_id: 99999, content: 'Hello phantom user' });

    assert.equal(res.status, 404);
    assert.match(res.body.error, /Recipient user does not exist/i);
  });

  it('should reject sending message to self', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient_id: user1.id, content: 'Talking to myself' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Cannot send a message to yourself/i);
  });

  it('should successfully persist a valid message from Alice to Bob', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient_id: user2.id, content: 'Hello Bob, nice to meet you!' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.sender_id, user1.id);
    assert.equal(res.body.data.recipient_id, user2.id);
    assert.equal(res.body.data.content, 'Hello Bob, nice to meet you!');
    assert.ok(res.body.data.created_at, 'Timestamp must be available');
    assert.ok(res.body.data.id, 'Message ID must be generated');
  });

  it('should successfully persist reply message from Bob to Alice', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ recipient_id: user1.id, content: 'Hey Alice! Great to connect.' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.sender_id, user2.id);
    assert.equal(res.body.data.recipient_id, user1.id);
    assert.equal(res.body.data.content, 'Hey Alice! Great to connect.');
  });

  it('should retrieve conversation history between Alice and Bob in chronological order', async () => {
    const res = await request(app)
      .get(`/api/messages/${user2.id}`)
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.recipient.username, 'bob');
    assert.equal(res.body.messages.length, 2);

    // Verify chronological order
    assert.equal(res.body.messages[0].sender_id, user1.id);
    assert.equal(res.body.messages[0].content, 'Hello Bob, nice to meet you!');
    assert.equal(res.body.messages[1].sender_id, user2.id);
    assert.equal(res.body.messages[1].content, 'Hey Alice! Great to connect.');
  });

  it('should ensure Charlie cannot see conversation history between Alice and Bob', async () => {
    // Charlie queries conversation with Bob (who hasn't messaged Charlie)
    const res = await request(app)
      .get(`/api/messages/${user2.id}`)
      .set('Authorization', `Bearer ${user3Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.messages.length, 0); // Empty: Charlie cannot see Alice/Bob messages
  });
});
