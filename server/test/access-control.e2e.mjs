/**
 * End-to-end check of authentication (register -> login -> refresh -> change
 * password -> forgot/reset) and authorization (owners see their own
 * properties, tenants see only what they rent, admins see everything).
 *
 * Needs the server running and the same Postgres it uses:
 *   npm run build && node dist/main.js
 *   node test/access-control.e2e.mjs
 *
 * It talks to the database directly for the two things HTTP cannot do:
 * mint the first admin, and plant a known password-reset token.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const db = new Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

const tag = randomUUID().slice(0, 8);
// The server normalises emails to lowercase, so the fixtures do too.
const email = (who) => `${who}.${tag}@example.test`.toLowerCase();
const PASSWORD = 'Sup3rSecret!';

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ok    ${name}`);
};

async function api(method, path, { token, body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text ? JSON.parse(text) : null,
    // The refresh token is httpOnly; grab it the way a browser would.
    cookie: (res.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(';')[0])
      .join('; '),
  };
}

const register = (who, role) =>
  api('POST', '/auth/register', {
    body: { name: who, email: email(who), password: PASSWORD, role },
  });

async function main() {
  await db.connect();

  console.log('\n1. Deny by default');
  const anon = await api('GET', '/properties');
  const anonUsers = await api('GET', '/users');
  const anonMe = await api('GET', '/auth/me');
  check('anonymous GET /properties is 401', () =>
    assert.equal(anon.status, 401),
  );
  check('anonymous GET /users is 401', () =>
    assert.equal(anonUsers.status, 401),
  );
  check('anonymous GET /auth/me is 401', () =>
    assert.equal(anonMe.status, 401),
  );

  // ── registration ────────────────────────────────────────────────
  console.log('\n2. Registration');
  const landlordA = await register('landlordA', 'landlord');
  const landlordB = await register('landlordB', 'landlord');
  const tenant = await register('tenant', 'tenant');
  const adminUser = await register('admin', 'landlord');

  check('register returns 201 with an access token', () => {
    assert.equal(landlordA.status, 201);
    assert.ok(landlordA.body.accessToken);
  });
  check('register never returns the password hash', () => {
    assert.equal(JSON.stringify(landlordA.body).includes('$2'), false);
  });
  check('refresh token is set as an httpOnly cookie, not in the body', () => {
    assert.match(landlordA.cookie, /refresh_token=/);
    assert.equal(landlordA.body.refreshToken, undefined);
  });
  const dupe = await register('landlordA', 'landlord');
  check('duplicate email returns 409', () => assert.equal(dupe.status, 409));

  const selfAdmin = await api('POST', '/auth/register', {
    body: {
      name: 'sneaky',
      email: email('sneaky'),
      password: PASSWORD,
      role: 'admin',
    },
  });
  check('cannot self-register as admin', () =>
    assert.equal(selfAdmin.status, 400),
  );

  const weak = await api('POST', '/auth/register', {
    body: { name: 'weak', email: email('weak'), password: 'short' },
  });
  check('short password is rejected by validation', () =>
    assert.equal(weak.status, 400),
  );

  const extra = await api('POST', '/auth/register', {
    body: {
      name: 'extra',
      email: email('extra'),
      password: PASSWORD,
      status: 'suspended',
    },
  });
  check('unknown body fields are rejected (whitelist)', () =>
    assert.equal(extra.status, 400),
  );

  // Promote one account out of band; there is no HTTP path to the first admin.
  await db.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
    email('admin'),
  ]);
  const admin = await api('POST', '/auth/login', {
    body: { user: email('admin'), password: PASSWORD },
  });
  check('login works after the role change', () =>
    assert.equal(admin.body.role, 'admin'),
  );

  const A = landlordA.body.accessToken;
  const B = landlordB.body.accessToken;
  const T = tenant.body.accessToken;
  const ADMIN = admin.body.accessToken;

  // ── login ───────────────────────────────────────────────────────
  console.log('\n3. Login');
  const badPassword = await api('POST', '/auth/login', {
    body: { user: email('landlordA'), password: 'wrong-password' },
  });
  const noSuchUser = await api('POST', '/auth/login', {
    body: { user: 'nobody@example.test', password: PASSWORD },
  });
  check('wrong password is 401', () => assert.equal(badPassword.status, 401));
  check('unknown user answers identically (no enumeration)', () => {
    assert.equal(noSuchUser.status, badPassword.status);
    assert.deepEqual(noSuchUser.body.message, badPassword.body.message);
  });

  const me = await api('GET', '/auth/me', { token: A });
  check('GET /auth/me returns the caller', () =>
    assert.equal(me.body.email, email('landlordA')),
  );
  check('GET /auth/me leaks no secrets', () => {
    for (const k of ['password', 'hashedRefreshToken', 'passwordResetToken']) {
      assert.equal(k in me.body, false, `${k} was returned`);
    }
  });
  const garbage = await api('GET', '/auth/me', { token: 'not-a-jwt' });
  check('garbage bearer token is 401', () => assert.equal(garbage.status, 401));

  // ── refresh ─────────────────────────────────────────────────────
  console.log('\n4. Refresh');
  const loginA = await api('POST', '/auth/login', {
    body: { user: email('landlordA'), password: PASSWORD },
  });
  const refreshed = await api('POST', '/auth/refresh', {
    cookie: loginA.cookie,
  });
  check('refresh with the cookie returns a new access token', () => {
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.body.accessToken);
  });
  const replay = await api('POST', '/auth/refresh', { cookie: loginA.cookie });
  check('the old refresh token is rejected after rotation', () =>
    assert.equal(replay.status, 401),
  );
  const noCookie = await api('POST', '/auth/refresh');
  check('refresh without a cookie is 401', () =>
    assert.equal(noCookie.status, 401),
  );

  // ── property ownership ──────────────────────────────────────────
  console.log('\n5. Property ownership');
  const created = await api('POST', '/properties', {
    token: A,
    body: { name: `Riverside ${tag}`, address: '123 Riverside Dr', city: 'Harare' },
  });
  check('a landlord can create a property', () =>
    assert.equal(created.status, 201),
  );
  const P = created.body.id;

  const tenantCreate = await api('POST', '/properties', {
    token: T,
    body: { name: 'Not mine', address: 'nowhere' },
  });
  check('a tenant cannot create a property', () =>
    assert.equal(tenantCreate.status, 403),
  );

  const listA = await api('GET', '/properties', { token: A });
  const listB = await api('GET', '/properties', { token: B });
  check('the owner sees their property', () =>
    assert.ok(listA.body.some((p) => p.id === P)),
  );
  check('another landlord does not see it', () =>
    assert.equal(listB.body.some((p) => p.id === P), false),
  );

  const readB = await api('GET', `/properties/${P}`, { token: B });
  check("another landlord's direct read is 404, not 403", () =>
    assert.equal(readB.status, 404),
  );
  const writeB = await api('PATCH', `/properties/${P}`, {
    token: B,
    body: { name: 'hijacked' },
  });
  const deleteB = await api('DELETE', `/properties/${P}`, { token: B });
  check('another landlord cannot edit it', () =>
    assert.equal(writeB.status, 404),
  );
  check('another landlord cannot delete it', () =>
    assert.equal(deleteB.status, 404),
  );

  const stillThere = await api('GET', `/properties/${P}`, { token: A });
  check('the property survived those attempts', () =>
    assert.equal(stillThere.body.name, `Riverside ${tag}`),
  );

  // ── tenants ─────────────────────────────────────────────────────
  console.log('\n6. Tenant access');
  const unit = await api('POST', `/properties/${P}/units`, {
    token: A,
    body: { label: 'Unit 2A', floor: '2nd', bedrooms: 2, rent: 650 },
  });
  const vacant = await api('POST', `/properties/${P}/units`, {
    token: A,
    body: { label: 'Unit 3B', rent: 700 },
  });
  check('the owner can add units', () => assert.equal(unit.status, 201));
  const U = unit.body.id;
  const V = vacant.body.id;

  const beforeMoveIn = await api('GET', '/properties', { token: T });
  check('a tenant with no tenancy sees no properties', () =>
    assert.equal(beforeMoveIn.body.length, 0),
  );

  const tenantId = (await api('GET', '/auth/me', { token: T })).body.id;
  const wrongAssign = await api('PATCH', `/properties/units/${U}/tenant`, {
    token: B,
    body: { tenantId },
  });
  check("another landlord cannot place a tenant in someone else's unit", () =>
    assert.equal(wrongAssign.status, 404),
  );

  const assigned = await api('PATCH', `/properties/units/${U}/tenant`, {
    token: A,
    body: { tenantId },
  });
  check('the owner can place a tenant', () => {
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.status, 'occupied');
  });

  const tenantList = await api('GET', '/properties', { token: T });
  check('the tenant now sees exactly the property they rent', () => {
    assert.equal(tenantList.body.length, 1);
    assert.equal(tenantList.body[0].id, P);
  });

  const tenantUnits = await api('GET', `/properties/${P}/units`, { token: T });
  check('the tenant sees only their own unit, not the vacant one', () => {
    assert.deepEqual(
      tenantUnits.body.map((u) => u.id),
      [U],
    );
  });

  const ownerUnits = await api('GET', `/properties/${P}/units`, { token: A });
  check('the owner sees every unit', () =>
    assert.equal(ownerUnits.body.length, 2),
  );

  const otherUnit = await api('GET', `/properties/units/${V}`, { token: T });
  check("the tenant cannot read a unit they don't rent", () =>
    assert.equal(otherUnit.status, 404),
  );

  const tenantEdit = await api('PATCH', `/properties/${P}`, {
    token: T,
    body: { name: 'mine now' },
  });
  check('the tenant cannot edit the property they rent in', () =>
    assert.equal(tenantEdit.status, 404),
  );

  const tenantAssign = await api('PATCH', `/properties/units/${V}/tenant`, {
    token: T,
    body: { tenantId },
  });
  check('the tenant cannot move themselves into a vacant unit', () =>
    assert.equal(tenantAssign.status, 404),
  );

  // ── admin ───────────────────────────────────────────────────────
  console.log('\n7. Admin override');
  const adminList = await api('GET', '/properties', { token: ADMIN });
  check("the admin sees another landlord's property", () =>
    assert.ok(adminList.body.some((p) => p.id === P)),
  );
  const adminUsers = await api('GET', '/users', { token: ADMIN });
  const ownerUsers = await api('GET', '/users', { token: A });
  check('the admin sees the whole user directory', () =>
    assert.ok(adminUsers.body.length > 1),
  );
  check('a non-admin sees only themselves', () => {
    assert.equal(ownerUsers.body.length, 1);
    assert.equal(ownerUsers.body[0].email, email('landlordA'));
  });

  const peek = await api('GET', `/users/${tenantId}`, { token: A });
  check("a non-admin cannot read another user's record", () =>
    assert.equal(peek.status, 403),
  );

  const escalate = await api('PATCH', `/users/${tenantId}`, {
    token: T,
    body: { role: 'admin' },
  });
  check('a user cannot patch their own role to admin', () =>
    assert.equal(escalate.status, 400),
  );
  const escalateRoute = await api('PATCH', `/users/${tenantId}/role`, {
    token: T,
    body: { role: 'admin' },
  });
  check('the role route is admin-only', () =>
    assert.equal(escalateRoute.status, 403),
  );
  const adminSetsRole = await api('PATCH', `/users/${tenantId}/role`, {
    token: ADMIN,
    body: { role: 'staff' },
  });
  check('an admin can change a role', () => {
    assert.equal(adminSetsRole.status, 200);
    assert.equal(adminSetsRole.body.role, 'staff');
  });
  await db.query(`UPDATE users SET role = 'tenant' WHERE id = $1`, [tenantId]);

  // ── password reset ──────────────────────────────────────────────
  console.log('\n8. Password reset');
  const known = await api('POST', '/auth/forgot-password', {
    body: { email: email('landlordB') },
  });
  const unknown = await api('POST', '/auth/forgot-password', {
    body: { email: 'nobody@example.test' },
  });
  check('forgot-password answers 200 for a known email', () =>
    assert.equal(known.status, 200),
  );
  check('an unknown email gets the identical answer (no enumeration)', () => {
    assert.equal(unknown.status, known.status);
    assert.deepEqual(unknown.body, known.body);
  });

  const stored = await db.query(
    `SELECT "passwordResetToken", "passwordResetTokenExpiration" FROM users WHERE email = $1`,
    [email('landlordB')],
  );
  check('the reset token is stored hashed, with an expiry', () => {
    assert.match(stored.rows[0].passwordResetToken, /^[0-9a-f]{64}$/);
    assert.ok(stored.rows[0].passwordResetTokenExpiration > new Date());
  });

  const plant = async (token, expiresAt) =>
    db.query(
      `UPDATE users SET "passwordResetToken" = $1,
                        "passwordResetTokenExpiration" = $2 WHERE email = $3`,
      [createHash('sha256').update(token).digest('hex'), expiresAt, email('landlordB')],
    );

  const malformed = await api('POST', '/auth/reset-password', {
    body: { email: email('landlordB'), token: 'zzz', newPassword: 'N3wPassw0rd!' },
  });
  check('a malformed token is a clean 400, not a 500', () =>
    assert.equal(malformed.status, 400),
  );

  await plant('expired-token-value', new Date(Date.now() - 1000));
  const expired = await api('POST', '/auth/reset-password', {
    body: {
      email: email('landlordB'),
      token: 'expired-token-value',
      newPassword: 'N3wPassw0rd!',
    },
  });
  check('an expired token is rejected', () => assert.equal(expired.status, 400));

  await plant('good-token-value', new Date(Date.now() + 3600_000));
  const wrongToken = await api('POST', '/auth/reset-password', {
    body: {
      email: email('landlordB'),
      token: 'bad-token-value',
      newPassword: 'N3wPassw0rd!',
    },
  });
  check('a wrong token is rejected', () => assert.equal(wrongToken.status, 400));

  const reset = await api('POST', '/auth/reset-password', {
    body: {
      email: email('landlordB'),
      token: 'good-token-value',
      newPassword: 'N3wPassw0rd!',
    },
  });
  check('a valid token resets the password', () =>
    assert.equal(reset.status, 200),
  );

  const reuse = await api('POST', '/auth/reset-password', {
    body: {
      email: email('landlordB'),
      token: 'good-token-value',
      newPassword: 'Another0ne!',
    },
  });
  check('the same token cannot be used twice', () =>
    assert.equal(reuse.status, 400),
  );

  const oldPassword = await api('POST', '/auth/login', {
    body: { user: email('landlordB'), password: PASSWORD },
  });
  const newPassword = await api('POST', '/auth/login', {
    body: { user: email('landlordB'), password: 'N3wPassw0rd!' },
  });
  check('the old password no longer works', () =>
    assert.equal(oldPassword.status, 401),
  );
  check('the new password works', () => assert.equal(newPassword.status, 200));

  const staleRefresh = await api('POST', '/auth/refresh', {
    cookie: landlordB.cookie,
  });
  check('sessions from before the reset are dead', () =>
    assert.equal(staleRefresh.status, 401),
  );

  // ── change password ─────────────────────────────────────────────
  console.log('\n9. Change password');
  const wrongCurrent = await api('POST', '/auth/change-password', {
    token: A,
    body: { currentPassword: 'not-my-password', newPassword: 'Ch4ngedPass!' },
  });
  check('the wrong current password is rejected', () =>
    assert.equal(wrongCurrent.status, 400),
  );
  const changed = await api('POST', '/auth/change-password', {
    token: A,
    body: { currentPassword: PASSWORD, newPassword: 'Ch4ngedPass!' },
  });
  check('the correct current password succeeds', () =>
    assert.equal(changed.status, 200),
  );
  const afterChange = await api('POST', '/auth/login', {
    body: { user: email('landlordA'), password: 'Ch4ngedPass!' },
  });
  check('login works with the new password', () =>
    assert.equal(afterChange.status, 200),
  );

  // ── logout ──────────────────────────────────────────────────────
  console.log('\n10. Logout');
  const out = await api('POST', '/auth/logout', {
    token: afterChange.body.accessToken,
  });
  check('logout succeeds', () => assert.equal(out.status, 200));
  const afterLogout = await api('POST', '/auth/refresh', {
    cookie: afterChange.cookie,
  });
  check('the refresh token is dead after logout', () =>
    assert.equal(afterLogout.status, 401),
  );

  // ── suspended accounts ──────────────────────────────────────────
  console.log('\n11. Suspended accounts');
  await db.query(`UPDATE users SET status = 'suspended' WHERE email = $1`, [
    email('tenant'),
  ]);
  const suspendedLogin = await api('POST', '/auth/login', {
    body: { user: email('tenant'), password: PASSWORD },
  });
  const suspendedToken = await api('GET', '/properties', { token: T });
  check('a suspended account cannot log in', () =>
    assert.equal(suspendedLogin.status, 401),
  );
  check('an already-issued token stops working once suspended', () =>
    assert.equal(suspendedToken.status, 401),
  );

  // cleanup
  await db.query(`DELETE FROM users WHERE email LIKE $1`, [`%.${tag}@example.test`]);
  await db.end();

  console.log(`\n${passed} checks passed`);
  if (process.exitCode) console.log('SOME CHECKS FAILED');
}

main().catch(async (err) => {
  console.error(err);
  await db.end().catch(() => {});
  process.exit(1);
});
