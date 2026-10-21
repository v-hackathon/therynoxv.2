const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const baseUrl = (process.env.TEST_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const timeoutMs = Number(process.env.TEST_HTTP_TIMEOUT_MS || 10000);

async function request(path, { method = 'GET', body, token, timeout = timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

test('HTTP integration: health endpoint is reachable', async () => {
  const result = await request('/health');
  assert.equal(result.status, 200, `Health endpoint failed: ${JSON.stringify(result.data)}`);
});

test('HTTP integration: registration, login, /me, validation and authorization', async (t) => {
  const email = `security-test-${randomUUID()}@example.test`;
  const password = `TnX!${randomUUID()}aA9`;

  const missingToken = await request('/auth/me');
  assert.equal(missingToken.status, 401, 'GET /auth/me must reject missing bearer token');

  const invalidToken = await request('/auth/me', { token: 'not.a.valid.jwt' });
  assert.equal(invalidToken.status, 401, 'GET /auth/me must reject malformed JWT');

  const weakPassword = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Security Test', email, password: 'weakpass' },
  });
  assert.equal(weakPassword.status, 400, 'Registration must reject a weak password');

  const registration = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Security Test', email, password },
  });
  assert.equal(registration.status, 201, `Registration failed: ${JSON.stringify(registration.data)}`);
  assert.equal(registration.data.user.email, email);
  assert.equal(Object.hasOwn(registration.data.user, 'password'), false, 'Registration response must not expose password');

  const duplicate = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Security Test', email: email.toUpperCase(), password },
  });
  assert.equal(duplicate.status, 409, 'Duplicate email must be rejected');

  const wrongPassword = await request('/auth/login', {
    method: 'POST',
    body: { email, password: `${password}wrong` },
  });
  assert.equal(wrongPassword.status, 401, 'Login must reject incorrect password');

  const login = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assert.equal(login.status, 200, `Login failed: ${JSON.stringify(login.data)}`);
  assert.equal(typeof login.data.accessToken, 'string');
  assert.equal(Object.hasOwn(login.data.user, 'password'), false, 'Login response must not expose password');

  const profile = await request('/auth/me', { token: login.data.accessToken });
  assert.equal(profile.status, 200, `Authenticated profile failed: ${JSON.stringify(profile.data)}`);
  assert.equal(profile.data.user.email, email);
  assert.equal(Object.hasOwn(profile.data.user, 'password'), false, '/me must not expose password');

  const adminRoute = await request('/rbac-test/admin', { token: login.data.accessToken });
  assert.equal(adminRoute.status, 403, 'CUSTOMER token must not access admin-only route');

  t.diagnostic(`Created disposable integration-test user: ${email}. Remove it manually if desired; the test does not delete database rows.`);
});
