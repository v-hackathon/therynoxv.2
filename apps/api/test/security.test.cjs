const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { AuthService } = require('../dist/auth/auth.service.js');

function makeService(overrides = {}) {
  const prisma = {
    user: {
      findUnique: async () => null,
      create: async ({ data, select }) => ({
        id: 'user-1',
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'CUSTOMER',
        sellerStatus: 'NOT_APPLIED',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      findMany: async () => [],
      update: async ({ data }) => ({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: data.role || 'CUSTOMER',
        sellerStatus: data.sellerStatus || 'PENDING',
      }),
    },
  };
  const jwtService = {
    signAsync: async (payload) => `signed.${payload.sub}.${payload.role}`,
  };
  Object.assign(prisma.user, overrides.user || {});
  return { service: new AuthService(prisma, jwtService), prisma, jwtService };
}

test('register normalizes email, hashes password, and never returns password/hash', async () => {
  const { service, prisma } = makeService();
  let stored;
  prisma.user.create = async ({ data }) => {
    stored = data;
    return {
      id: 'user-1', name: data.name, email: data.email,
      role: 'CUSTOMER', sellerStatus: 'NOT_APPLIED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
  };

  const result = await service.register({
    name: '  Test User  ',
    email: '  TEST@example.com ',
    password: 'RynoX@2026Secure',
  });

  assert.equal(stored.name, 'Test User');
  assert.equal(stored.email, 'test@example.com');
  assert.notEqual(stored.password, 'RynoX@2026Secure');
  assert.equal(await bcrypt.compare('RynoX@2026Secure', stored.password), true);
  assert.equal(Object.hasOwn(result.user, 'password'), false);
  assert.equal(JSON.stringify(result).includes(stored.password), false);
});

test('register rejects an already registered email', async () => {
  const conflict = Object.assign(new Error('Email is already registered'), { status: 409 });
  const { service } = makeService({
    user: { findUnique: async () => ({ id: 'existing-user' }) },
  });
  await assert.rejects(service.register({
    name: 'Test User',
    email: 'EXISTING@example.com',
    password: 'RynoX@2026Secure',
  }), (error) => error.status === 409 && /already registered/i.test(error.message));
});

test('login returns a JWT and safe user profile for valid credentials', async () => {
  const hash = await bcrypt.hash('RynoX@2026Secure', 4);
  const user = {
    id: 'user-1', name: 'Test User', email: 'test@example.com',
    password: hash, role: 'CUSTOMER', sellerStatus: 'NOT_APPLIED',
  };
  const { service, jwtService } = makeService({
    user: { findUnique: async () => user },
  });
  const result = await service.login({ email: ' TEST@example.com ', password: 'RynoX@2026Secure' });
  assert.equal(result.accessToken, 'signed.user-1.CUSTOMER');
  assert.equal(result.user.email, 'test@example.com');
  assert.equal(Object.hasOwn(result.user, 'password'), false);
});

test('login rejects an unknown email with a generic unauthorized error', async () => {
  const { service } = makeService({ user: { findUnique: async () => null } });
  await assert.rejects(
    service.login({ email: 'missing@example.com', password: 'RynoX@2026Secure' }),
    (error) => error.status === 401 && error.message === 'Invalid email or password',
  );
});

test('login rejects an incorrect password with the same generic error', async () => {
  const hash = await bcrypt.hash('DifferentPass@123', 4);
  const user = {
    id: 'user-1', name: 'Test User', email: 'test@example.com',
    password: hash, role: 'CUSTOMER', sellerStatus: 'NOT_APPLIED',
  };
  const { service } = makeService({ user: { findUnique: async () => user } });
  await assert.rejects(
    service.login({ email: 'test@example.com', password: 'WrongPass@123' }),
    (error) => error.status === 401 && error.message === 'Invalid email or password',
  );
});

test('current-user response omits password fields', async () => {
  const user = {
    id: 'user-1', name: 'Test User', email: 'test@example.com',
    role: 'CUSTOMER', sellerStatus: 'NOT_APPLIED',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const { service } = makeService({ user: { findUnique: async () => user } });
  const result = await service.getCurrentUser('user-1');
  assert.equal(result.user.id, 'user-1');
  assert.equal(Object.hasOwn(result.user, 'password'), false);
});

test('current-user endpoint logic rejects a deleted/missing user', async () => {
  const { service } = makeService({ user: { findUnique: async () => null } });
  await assert.rejects(
    service.getCurrentUser('deleted-user'),
    (error) => error.status === 401,
  );
});

test('seller application rejects admin accounts', async () => {
  const { service } = makeService({
    user: { findUnique: async () => ({ id: 'admin-1', role: 'ADMIN', sellerStatus: 'NOT_APPLIED' }) },
  });
  await assert.rejects(
    service.applyForSeller('admin-1'),
    (error) => error.status === 400,
  );
});

// JWT payload validation and role authorization unit tests (no database access).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-only-secret-change-me';
const { JwtStrategy } = require('../dist/auth/jwt-strategy/jwt-strategy.service.js');
const { RolesGuard } = require('../dist/auth/roles.guard.js');

test('JWT strategy accepts a valid payload and returns a safe request user', () => {
  const strategy = new JwtStrategy();
  const result = strategy.validate({
    sub: 'user-1',
    email: 'test@example.com',
    role: 'CUSTOMER',
  });
  assert.deepEqual(result, {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'CUSTOMER',
  });
  assert.equal(Object.hasOwn(result, 'password'), false);
});

test('JWT strategy rejects missing subject, email, or invalid role', () => {
  const strategy = new JwtStrategy();
  for (const payload of [
    { email: 'test@example.com', role: 'CUSTOMER' },
    { sub: 'user-1', role: 'CUSTOMER' },
    { sub: 'user-1', email: 'test@example.com', role: 'SUPERADMIN' },
  ]) {
    assert.throws(() => strategy.validate(payload), (error) => error.status === 401);
  }
});

test('roles guard allows a matching role and denies a non-matching role', () => {
  let requiredRoles = ['ADMIN'];
  const reflector = {
    getAllAndOverride: () => requiredRoles,
  };
  const guard = new RolesGuard(reflector);
  const makeContext = (user) => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });

  assert.equal(guard.canActivate(makeContext({ userId: 'admin-1', role: 'ADMIN' })), true);
  assert.equal(guard.canActivate(makeContext({ userId: 'customer-1', role: 'CUSTOMER' })), false);
  assert.equal(guard.canActivate(makeContext(undefined)), false);

  requiredRoles = [];
  assert.equal(guard.canActivate(makeContext(undefined)), true);
});


// Cryptographic JWT lifecycle tests (no database access).
const { JwtService } = require('@nestjs/jwt');

test('JWT signature verifies with the configured secret and rejects a different secret', async () => {
  const issuer = new JwtService({ secret: 'test-secret-one', signOptions: { expiresIn: '1m' } });
  const verifier = new JwtService({ secret: 'test-secret-one' });
  const wrongVerifier = new JwtService({ secret: 'test-secret-two' });
  const token = await issuer.signAsync({ sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' });

  const payload = await verifier.verifyAsync(token);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.role, 'CUSTOMER');
  await assert.rejects(wrongVerifier.verifyAsync(token));
});

test('JWT verification rejects expired tokens', async () => {
  const signer = new JwtService({ secret: 'expiry-test-secret', signOptions: { expiresIn: '-1s' } });
  const verifier = new JwtService({ secret: 'expiry-test-secret' });
  const token = await signer.signAsync({ sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' });
  await assert.rejects(verifier.verifyAsync(token));
});

test('JWT verification rejects malformed tokens', async () => {
  const verifier = new JwtService({ secret: 'test-secret' });
  await assert.rejects(verifier.verifyAsync('not.a.valid.jwt'));
});
