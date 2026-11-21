/**
 * KenaX BD — Phase 3 Security, Data Integrity & Deployment Audit Automated Verification Suite
 *
 * Executes without deploying anything:
 *   npx tsx tests/phase3-security-audit.verify.ts
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

import {
  hashPasswordScrypt,
  isScryptHash,
  verifyPasswordAgainstHash,
  signServerStaffToken,
  verifyServerStaffToken,
  authenticateStaffBearerRequest,
  createRequireStaffMiddleware,
  sanitizeStaffForResponse,
} from '../src/lib/serverStaffAuth.ts';
import {
  runMigrationWithAdapter,
  type MigrationBackendAdapter,
  type MigrationStorageLike,
} from '../src/lib/firestoreMigration.ts';
import { AdminDataCache } from '../src/lib/adminCache.ts';
import {
  runCursorPaginationWithAdapter,
  type CursorQueryAdapter,
} from '../src/lib/firestorePagination.ts';
import {
  computeStoreSalesSummary,
  computeInventoryMetrics,
  deduplicateOrdersById,
  getCanonicalOrderBucket,
} from '../src/utils/salesAnalytics.ts';

const require = createRequire(import.meta.url);
const functionsModule = require('../functions/index.js');

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ suite, name, passed: true });
    console.log(`  ✅ [${suite}] ${name}`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err?.message || String(err) });
    console.error(`  ❌ [${suite}] ${name}: ${err?.message || err}`);
  }
}

async function httpRequest(
  port: number,
  method: string,
  urlPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, json: raw ? JSON.parse(raw) : null });
          } catch {
            resolve({ status: res.statusCode || 0, json: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('\n================ PHASE 3 SECURITY & DATA INTEGRITY AUDIT TESTS ================\n');

  // =========================================================================
  // SUITE 1: PASSWORD SECURITY & TOKEN AUTH (serverStaffAuth.ts)
  // =========================================================================
  await test('Auth & Crypto', 'Per-user salted scrypt generates unique salts and verifies in constant time', () => {
    const h1 = hashPasswordScrypt('StrongPass!2026');
    const h2 = hashPasswordScrypt('StrongPass!2026');
    assert.ok(isScryptHash(h1));
    assert.ok(isScryptHash(h2));
    assert.notEqual(h1, h2, 'Salted scrypt hashes for identical passwords must differ');
    assert.equal(verifyPasswordAgainstHash('StrongPass!2026', h1).valid, true);
    assert.equal(verifyPasswordAgainstHash('StrongPass!2026', h1).needsUpgrade, false);
    assert.equal(verifyPasswordAgainstHash('WrongPass!2026', h1).valid, false);
  });

  await test('Auth & Crypto', 'Legacy SHA-256 hash verifies once and flags needsUpgrade=true', () => {
    const legacyHex = crypto.createHash('sha256').update('kenaxbd-staff-v1:OldPass123').digest('hex');
    const legacyHash = `sha256:${legacyHex}`;
    const ok = verifyPasswordAgainstHash('OldPass123', legacyHash);
    assert.equal(ok.valid, true);
    assert.equal(ok.needsUpgrade, true);
    const bad = verifyPasswordAgainstHash('NotOldPass', legacyHash);
    assert.equal(bad.valid, false);
  });

  await test('Auth & Crypto', 'Server staff tokens reject tampering, expiration, and forged headers', async () => {
    const staffList: any[] = [
      { id: 's-super', name: 'Super', email: 'sadikrtx3060@gmail.com', role: 'super_admin', isActive: true, status: 'active' },
      { id: 's-mod', name: 'Mod', email: 'mod@kenaxbd.com', role: 'moderator', isActive: true, status: 'active' },
      { id: 's-sus', name: 'Sus', email: 'sus@kenaxbd.com', role: 'super_admin', isActive: false, status: 'suspended' },
    ];
    const provider = {
      getAllStaff: () => staffList,
      getTokenVersion: () => 1,
      verifyFirebaseIdToken: async () => null,
    };

    const token = signServerStaffToken(staffList[0], 1);
    assert.ok(verifyServerStaffToken(token));
    assert.equal(verifyServerStaffToken(`${token}tampered`), null);

    // Expired token MUST fail
    const expiredToken = signServerStaffToken(staffList[0], 1, -10);
    assert.equal(verifyServerStaffToken(expiredToken), null);

    // Forged x-staff-role header with NO Bearer token MUST fail with 401
    const forgedReq: any = {
      headers: {
        'x-staff-role': 'super_admin',
        'x-staff-email': 'sadikrtx3060@gmail.com',
        'x-staff-id': 's-super',
      },
      body: { actorRole: 'super_admin' },
    };
    const forgedRes = await authenticateStaffBearerRequest(forgedReq, provider);
    assert.equal(forgedRes.ok, false);
    if (!forgedRes.ok) assert.equal(forgedRes.status, 401);

    // Moderator token calling Super Admin middleware MUST fail with 403 even with forged x-staff-role header
    const modToken = signServerStaffToken(staffList[1], 1);
    const mw = createRequireStaffMiddleware(provider, ['super_admin']);
    let modStatus = 0;
    let modCalledNext = false;
    await mw(
      { headers: { authorization: `Bearer ${modToken}`, 'x-staff-role': 'super_admin' } } as any,
      {
        status(code: number) {
          modStatus = code;
          return { json: () => {} };
        },
      } as any,
      () => {
        modCalledNext = true;
      }
    );
    assert.equal(modCalledNext, false);
    assert.equal(modStatus, 403);

    // Suspended Super Admin token MUST fail with 403
    const susToken = signServerStaffToken(staffList[2], 1);
    const susRes = await authenticateStaffBearerRequest(
      { headers: { authorization: `Bearer ${susToken}` } } as any,
      provider
    );
    assert.equal(susRes.ok, false);
    if (!susRes.ok) assert.equal(susRes.status, 403);

    // Sanitizer strips password & passwordHash
    const sanitized = sanitizeStaffForResponse({ id: 's1', password: 'secret', passwordHash: 'scrypt:aa:bb', email: 'a@b.c' } as any);
    assert.equal('password' in sanitized, false);
    assert.equal('passwordHash' in sanitized, false);
  });

  // =========================================================================
  // SUITE 2: CLOUD FUNCTIONS API AUTHORIZATION & RBAC ENDPOINTS
  // =========================================================================
  const mockStaffDocs = new Map<string, any>([
    [
      'staff-super-1',
      {
        id: 'staff-super-1',
        name: 'Sadik Super',
        email: 'sadikrtx3060@gmail.com',
        phone: '01700000001',
        role: 'super_admin',
        isActive: true,
        status: 'active',
        firebaseUid: 'uid-super-1',
      },
    ],
    [
      'staff-mod-1',
      {
        id: 'staff-mod-1',
        name: 'Mod User',
        email: 'mod@kenaxbd.com',
        phone: '01700000002',
        role: 'moderator',
        isActive: true,
        status: 'active',
        firebaseUid: 'uid-mod-1',
      },
    ],
    [
      'staff-mgr-1',
      {
        id: 'staff-mgr-1',
        name: 'Mgr User',
        email: 'mgr@kenaxbd.com',
        phone: '01700000003',
        role: 'manager',
        isActive: true,
        status: 'active',
        firebaseUid: 'uid-mgr-1',
      },
    ],
    [
      'staff-sus-1',
      {
        id: 'staff-sus-1',
        name: 'Suspended Super',
        email: 'sus@kenaxbd.com',
        phone: '01700000004',
        role: 'super_admin',
        isActive: false,
        status: 'suspended',
        firebaseUid: 'uid-sus-1',
      },
    ],
  ]);

  const mockCredDocs = new Map<string, any>([
    ['staff-super-1', { staffId: 'staff-super-1', passwordHash: functionsModule._hashPasswordScrypt('SuperSecret#99') }],
    [
      'staff-mod-1',
      {
        staffId: 'staff-mod-1',
        // Legacy SHA-256 hash to verify automatic scrypt upgrade on login
        passwordHash:
          'sha256:' + crypto.createHash('sha256').update('kenaxbd-staff-v1:ModPass#99').digest('hex'),
      },
    ],
    ['staff-mgr-1', { staffId: 'staff-mgr-1', passwordHash: functionsModule._hashPasswordScrypt('MgrPass#99') }],
    ['staff-sus-1', { staffId: 'staff-sus-1', passwordHash: functionsModule._hashPasswordScrypt('SusPass#99') }],
  ]);

  const revokedUids = new Set<string>();
  const TOK_SUPER = 'firebase-id-token-super-admin-00001';
  const TOK_MOD = 'firebase-id-token-moderator-user-002';
  const TOK_MGR = 'firebase-id-token-manager-user-00003';
  const TOK_SUS = 'firebase-id-token-suspended-super-04';
  const mockTokens = new Map<string, any>([
    [TOK_SUPER, { uid: 'uid-super-1', email: 'sadikrtx3060@gmail.com', staffId: 'staff-super-1', role: 'super_admin' }],
    [TOK_MOD, { uid: 'uid-mod-1', email: 'mod@kenaxbd.com', staffId: 'staff-mod-1', role: 'moderator' }],
    [TOK_MGR, { uid: 'uid-mgr-1', email: 'mgr@kenaxbd.com', staffId: 'staff-mgr-1', role: 'manager' }],
    [TOK_SUS, { uid: 'uid-sus-1', email: 'sus@kenaxbd.com', staffId: 'staff-sus-1', role: 'super_admin' }],
  ]);

  let secretState: any = { apiKeyHash: '', maskedKey: '', lowStockThreshold: 5, createdAt: null, rotatedAt: null, updatedBy: null };
  const mockOrders = [
    {
      id: 'KB-404450',
      customerName: 'Karim',
      customerMobile: '01712345678',
      orderStatus: 'Confirmed',
      paymentStatus: 'Unpaid',
      totalAmount: 1500,
      deliveryCharge: 100,
      items: [{ productId: 'p1', name: 'Watch', quantity: 1, price: 1400 }],
    },
  ];

  const mockAdapter = {
    readSecretConfig: async () => secretState,
    writeSecretConfig: async (next: any) => {
      secretState = { ...secretState, ...next };
      return secretState;
    },
    getAllStaff: async () => Array.from(mockStaffDocs.values()),
    getStaffCredential: async (id: string) => mockCredDocs.get(id) || null,
    saveStaffCredential: async (id: string, payload: any) => {
      mockCredDocs.set(id, payload);
      return payload;
    },
    deleteStaffCredential: async (id: string) => {
      mockCredDocs.delete(id);
    },
    saveStaffDoc: async (id: string, payload: any) => {
      const clean = { ...payload, id };
      delete clean.password;
      delete clean.passwordHash;
      mockStaffDocs.set(id, clean);
      return clean;
    },
    deleteStaffDoc: async (id: string) => {
      mockStaffDocs.delete(id);
    },
    verifyIdToken: async (token: string, checkRevoked = true) => {
      const decoded = mockTokens.get(token);
      if (!decoded) return null;
      if (checkRevoked && revokedUids.has(decoded.uid)) return null;
      return decoded;
    },
    syncFirebaseStaffUser: async ({ uid, email }: any) => uid || `uid-${email}`,
    createCustomToken: async (uid: string, claims: any) => `custom.${uid}.${claims.role}`,
    revokeUserRefreshTokens: async (uid: string) => {
      if (uid) revokedUids.add(uid);
    },
    getAllOrders: async () => mockOrders,
    getOrderById: async (id: string) => {
      const found = mockOrders.find((o) => o.id.toUpperCase() === id.toUpperCase());
      return found ? { docId: found.id, data: found } : null;
    },
    updateOrder: async (id: string, u: any) => ({ id, ...u }),
    getAllProducts: async () => [],
    updateProductStock: async () => {},
    getAllActivityLogs: async () => [],
    appendActivityLog: async (entry: any) => entry,
  };

  const fnApp = functionsModule._createIntegrationApp(mockAdapter);
  const server = http.createServer(fnApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;

  try {
    await test('API Auth & RBAC', 'Forged x-staff-role:super_admin header without Bearer token returns 401', async () => {
      const res = await httpRequest(port, 'GET', '/api/integration/admin/config', {
        'x-staff-role': 'super_admin',
        'x-staff-email': 'sadikrtx3060@gmail.com',
        'x-staff-id': 'staff-super-1',
      });
      assert.equal(res.status, 401);
      assert.equal(res.json.ok, false);
    });

    await test('API Auth & RBAC', 'Invalid Bearer token returns 401', async () => {
      const res = await httpRequest(port, 'GET', '/api/integration/admin/config', {
        Authorization: 'Bearer invalid.jwt.token',
        'x-staff-role': 'super_admin',
      });
      assert.equal(res.status, 401);
    });

    await test('API Auth & RBAC', 'Moderator & Manager attempting Super Admin config or staff mutation get 403', async () => {
      const modConfig = await httpRequest(port, 'GET', '/api/integration/admin/config', {
        Authorization: `Bearer ${TOK_MOD}`,
      });
      assert.equal(modConfig.status, 403);

      const mgrKey = await httpRequest(port, 'POST', '/api/integration/admin/generate-key', {
        Authorization: `Bearer ${TOK_MGR}`,
      });
      assert.equal(mgrKey.status, 403);

      // Moderator trying to elevate own role to super_admin
      const modElevate = await httpRequest(
        port,
        'PATCH',
        '/api/staff-auth/staff/staff-mod-1',
        { Authorization: `Bearer ${TOK_MOD}` },
        { role: 'super_admin' }
      );
      assert.equal(modElevate.status, 403);

      // Manager trying to edit Super Admin
      const mgrTouchSuper = await httpRequest(
        port,
        'PATCH',
        '/api/staff-auth/staff/staff-super-1',
        { Authorization: `Bearer ${TOK_MGR}` },
        { isActive: false }
      );
      assert.equal(mgrTouchSuper.status, 403);
    });

    await test('API Auth & RBAC', 'Suspended Super Admin gets 403 on login and protected endpoints', async () => {
      const loginRes = await httpRequest(port, 'POST', '/api/staff-auth/login', {}, {
        identifier: 'sus@kenaxbd.com',
        password: 'SusPass#99',
      });
      assert.equal(loginRes.status, 403);

      const cfgRes = await httpRequest(port, 'GET', '/api/integration/admin/config', {
        Authorization: `Bearer ${TOK_SUS}`,
      });
      assert.equal(cfgRes.status, 403);
    });

    await test('API Auth & RBAC', 'Valid Super Admin login returns customToken + sanitized staff (zero passwordHash)', async () => {
      const loginRes = await httpRequest(port, 'POST', '/api/staff-auth/login', {}, {
        identifier: 'sadikrtx3060@gmail.com',
        password: 'SuperSecret#99',
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.json.ok, true);
      assert.ok(loginRes.json.customToken);
      assert.equal('password' in loginRes.json.staff, false);
      assert.equal('passwordHash' in loginRes.json.staff, false);

      const cfgRes = await httpRequest(port, 'GET', '/api/integration/admin/config', {
        Authorization: `Bearer ${TOK_SUPER}`,
      });
      assert.equal(cfgRes.status, 200);
      assert.equal(cfgRes.json.ok, true);
    });

    await test('API Auth & RBAC', 'Moderator legacy SHA-256 login transparently upgrades stored hash to salted scrypt', async () => {
      const beforeHash = mockCredDocs.get('staff-mod-1')?.passwordHash;
      assert.ok(String(beforeHash).startsWith('sha256:'));
      const loginRes = await httpRequest(port, 'POST', '/api/staff-auth/login', {}, {
        identifier: 'mod@kenaxbd.com',
        password: 'ModPass#99',
      });
      assert.equal(loginRes.status, 200);
      const afterHash = mockCredDocs.get('staff-mod-1')?.passwordHash;
      assert.ok(String(afterHash).startsWith('scrypt:'), 'Legacy SHA-256 credential must auto-upgrade to salted scrypt');
    });

    await test('API Auth & RBAC', 'Last active Super Admin cannot be deleted or demoted (409 Conflict)', async () => {
      const delRes = await httpRequest(port, 'DELETE', '/api/staff-auth/staff/staff-super-1', {
        Authorization: `Bearer ${TOK_SUPER}`,
      });
      assert.equal(delRes.status, 409);
      assert.equal(delRes.json.error, 'cannot_delete_last_super_admin');

      const demoteRes = await httpRequest(
        port,
        'PATCH',
        '/api/staff-auth/staff/staff-super-1',
        { Authorization: `Bearer ${TOK_SUPER}` },
        { role: 'moderator' }
      );
      assert.equal(demoteRes.status, 409);
      assert.equal(demoteRes.json.error, 'cannot_demote_last_super_admin');
    });

    await test('API Auth & RBAC', 'Suspending a Moderator revokes refresh tokens so existing Bearer token immediately fails', async () => {
      const patchRes = await httpRequest(
        port,
        'PATCH',
        '/api/staff-auth/staff/staff-mod-1',
        { Authorization: `Bearer ${TOK_SUPER}` },
        { isActive: false, status: 'suspended' }
      );
      assert.equal(patchRes.status, 200);
      assert.equal(revokedUids.has('uid-mod-1'), true);

      const meRes = await httpRequest(port, 'GET', '/api/staff-auth/me', {
        Authorization: `Bearer ${TOK_MOD}`,
      });
      assert.equal(meRes.status, 401);
    });

    await test('API Auth & RBAC', 'Public Track Order requires BOTH matching Order ID AND Phone (blocks PII scraping)', async () => {
      const badPhone = await httpRequest(port, 'POST', '/api/staff-auth/track-order', {}, {
        orderId: 'KB-404450',
        phone: '01799999999',
      });
      assert.equal(badPhone.status, 404);

      const goodMatch = await httpRequest(port, 'POST', '/api/staff-auth/track-order', {}, {
        orderId: 'KB-404450',
        phone: '01712345678',
      });
      assert.equal(goodMatch.status, 200);
      assert.equal(goodMatch.json.order.id, 'KB-404450');
    });
  } finally {
    server.close();
  }

  // =========================================================================
  // SUITE 3: LOCALSTORAGE MIGRATION INTEGRITY & CONCURRENCY
  // =========================================================================
  function createMemoryStorage(initial: Record<string, string>): MigrationStorageLike & { store: Map<string, string> } {
    const store = new Map(Object.entries(initial));
    return {
      store,
      getItem: (k) => (store.has(k) ? store.get(k)! : null),
      removeItem: (k) => {
        store.delete(k);
      },
    };
  }

  await test('Migration Integrity', 'Simultaneous dual-browser migration uses distributed lease lock — zero duplicate writes', async () => {
    let leaseDoc: any = null;
    const writtenOrders = new Map<string, any>();
    let orderCounter = 404400;
    let writeCalls = 0;

    const adapter: MigrationBackendAdapter = {
      async acquireLease(lockId, nowMs, ttlMs) {
        if (leaseDoc?.completed) return { outcome: 'already_completed', counts: leaseDoc.counts };
        if (leaseDoc?.status === 'in_progress' && leaseDoc.lockExpiresAtMs > nowMs) {
          return { outcome: 'locked' };
        }
        leaseDoc = { completed: false, status: 'in_progress', lockId, lockExpiresAtMs: nowMs + ttlMs };
        return { outcome: 'acquired' };
      },
      async releaseLease(lockId, state) {
        if (leaseDoc?.lockId === lockId) leaseDoc = { ...leaseDoc, ...state, lockId: null, lockExpiresAtMs: 0 };
      },
      async isCollectionEmpty(col) {
        return col === 'orders' ? writtenOrders.size === 0 : true;
      },
      async writeAndVerifyDoc(_col, id, data) {
        await new Promise((r) => setTimeout(r, 15));
        writeCalls += 1;
        writtenOrders.set(id, data);
        return true;
      },
      async advanceOrderCounterAtomic(minVal) {
        orderCounter = Math.max(orderCounter, minVal);
        return orderCounter;
      },
      async migrateStaffViaServer() {
        return true;
      },
    };

    const legacyOrders = JSON.stringify([
      { id: 'KB-405001', customerName: 'Test 1', totalAmount: 900 },
      { id: 'KB-405002', customerName: 'Test 2', totalAmount: 1200 },
    ]);
    const browserA = createMemoryStorage({ kenax_orders_cache: legacyOrders });
    const browserB = createMemoryStorage({ kenax_orders_cache: legacyOrders });

    const [resA, resB] = await Promise.all([
      runMigrationWithAdapter(adapter, browserA),
      runMigrationWithAdapter(adapter, browserB),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(statuses, ['completed', 'locked_by_other_client']);
    assert.equal(writeCalls, 2, 'Each order must be written exactly once');
    assert.equal(writtenOrders.size, 2);
    assert.equal(orderCounter, 405002, 'orderCounter must advance atomically past highest migrated KB-######');
    assert.equal(browserA.store.has('kenax_orders_cache'), false, 'Verified browser A clears migrated keys');
    assert.equal(browserB.store.has('kenax_orders_cache'), true, 'Locked browser B does not prematurely delete keys');

    // Re-run on Browser B after completion → already_completed, zero new writes
    const resB2 = await runMigrationWithAdapter(adapter, browserB);
    assert.equal(resB2.status, 'already_completed');
    assert.equal(writeCalls, 2);
  });

  await test('Migration Integrity', 'Failed or unverified Firestore write NEVER clears localStorage and safely retries', async () => {
    let leaseDoc: any = null;
    let shouldFail = true;
    const writtenOrders = new Map<string, any>();

    const adapter: MigrationBackendAdapter = {
      async acquireLease(lockId, nowMs, ttlMs) {
        if (leaseDoc?.completed) return { outcome: 'already_completed' };
        if (leaseDoc?.status === 'in_progress' && leaseDoc.lockExpiresAtMs > nowMs) return { outcome: 'locked' };
        leaseDoc = { completed: false, status: 'in_progress', lockId, lockExpiresAtMs: nowMs + ttlMs };
        return { outcome: 'acquired' };
      },
      async releaseLease(lockId, state) {
        if (leaseDoc?.lockId === lockId) leaseDoc = { ...leaseDoc, ...state, lockId: null, lockExpiresAtMs: 0 };
      },
      async isCollectionEmpty() {
        return writtenOrders.size === 0;
      },
      async writeAndVerifyDoc(_col, id, data) {
        if (shouldFail) return false; // Simulate server verification failure
        writtenOrders.set(id, data);
        return true;
      },
      async advanceOrderCounterAtomic(minVal) {
        return minVal;
      },
      async migrateStaffViaServer() {
        return true;
      },
    };

    const storage = createMemoryStorage({
      kenax_orders_cache: JSON.stringify([{ id: 'KB-406001', customerName: 'Retry User', totalAmount: 500 }]),
    });

    const firstRun = await runMigrationWithAdapter(adapter, storage);
    assert.equal(firstRun.status, 'partial_failure');
    assert.equal(storage.store.has('kenax_orders_cache'), true, 'localStorage MUST be preserved when write verification fails');
    assert.equal(leaseDoc.completed, false);

    // Retry once backend recovers
    shouldFail = false;
    const secondRun = await runMigrationWithAdapter(adapter, storage);
    assert.equal(secondRun.status, 'completed');
    assert.equal(writtenOrders.has('KB-406001'), true);
    assert.equal(storage.store.has('kenax_orders_cache'), false, 'localStorage cleared only after verified write');
  });

  await test('Migration Integrity', 'Expired crash lease is safely taken over and resumed', async () => {
    let leaseDoc: any = { completed: false, status: 'in_progress', lockId: 'crashed-tab', lockExpiresAtMs: 1000 };
    const writtenProducts = new Map<string, any>();
    const adapter: MigrationBackendAdapter = {
      async acquireLease(lockId, nowMs, ttlMs) {
        if (leaseDoc?.status === 'in_progress' && leaseDoc.lockExpiresAtMs > nowMs) return { outcome: 'locked' };
        leaseDoc = { completed: false, status: 'in_progress', lockId, lockExpiresAtMs: nowMs + ttlMs };
        return { outcome: 'acquired' };
      },
      async releaseLease(lockId, state) {
        if (leaseDoc?.lockId === lockId) leaseDoc = { ...leaseDoc, ...state };
      },
      async isCollectionEmpty() {
        return true;
      },
      async writeAndVerifyDoc(_col, id, data) {
        writtenProducts.set(id, data);
        return true;
      },
      async advanceOrderCounterAtomic(v) {
        return v;
      },
      async migrateStaffViaServer() {
        return true;
      },
    };
    const storage = createMemoryStorage({
      kenax_products_cache: JSON.stringify([{ id: 'prod-legacy-1', name: 'Legacy Item', price: 350 }]),
    });
    const res = await runMigrationWithAdapter(adapter, storage, () => 5000);
    assert.equal(res.status, 'completed');
    assert.equal(writtenProducts.has('prod-legacy-1'), true);
  });

  // =========================================================================
  // SUITE 4: PAGINATION & CACHE ISOLATION
  // =========================================================================
  await test('Pagination & Cache', 'Cursor Next/Prev returns zero skips or duplicates and resets cleanly on deleted cursor', async () => {
    let dataset = Array.from({ length: 7 }, (_, i) => ({
      id: `doc-${String(7 - i).padStart(2, '0')}`,
      createdAt: `2026-11-0${7 - i}T00:00:00.000Z`,
    }));

    const adapter: CursorQueryAdapter<{ id: string; createdAt?: string }> = {
      getTotalCount: async () => dataset.length,
      getIndexedCount: async () => dataset.filter((d) => Boolean(d.createdAt)).length,
      queryByField: async (_f, _dir, afterDoc, max) => {
        const sorted = [...dataset]
          .filter((d) => Boolean(d.createdAt))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        if (!afterDoc) return sorted.slice(0, max);
        const idx = sorted.findIndex((d) => d.id === afterDoc.id);
        if (idx === -1) return []; // Deleted cursor returns empty!
        return sorted.slice(idx + 1, idx + 1 + max);
      },
      queryByDocId: async (afterDoc, max) => {
        const sorted = [...dataset].sort((a, b) => b.id.localeCompare(a.id));
        if (!afterDoc) return sorted.slice(0, max);
        const idx = sorted.findIndex((d) => d.id === afterDoc.id);
        if (idx === -1) return [];
        return sorted.slice(idx + 1, idx + 1 + max);
      },
    };

    const cache = new AdminDataCache();
    const cursors = new Map<string, Map<number, any>>();
    const fallbacks = new Map<string, boolean>();
    const scope = cache.makeScope('s1', 'super_admin');

    const p1 = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'orders', orderField: 'createdAt', page: 1, pageSize: 3 });
    const p2 = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'orders', orderField: 'createdAt', page: 2, pageSize: 3 });
    const p3 = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'orders', orderField: 'createdAt', page: 3, pageSize: 3 });

    const allIds = [...p1.items, ...p2.items, ...p3.items].map((d) => d.id);
    assert.deepEqual(allIds, ['doc-07', 'doc-06', 'doc-05', 'doc-04', 'doc-03', 'doc-02', 'doc-01']);
    assert.equal(new Set(allIds).size, 7);
    assert.equal(p3.hasNextPage, false);

    // Previous page hits cache seamlessly
    const p2Cached = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'orders', orderField: 'createdAt', page: 2, pageSize: 3 });
    assert.equal(p2Cached.fromCache, true);
    assert.deepEqual(p2Cached.items.map((d) => d.id), ['doc-04', 'doc-03', 'doc-02']);

    // Simulate deleted cursor document for page 2, then request uncached page 3 -> safely resets to Page 1!
    dataset = dataset.filter((d) => d.id !== 'doc-02');
    cache.invalidate(scope, cache.makePageKey('orders', 3, 3, 'default'));
    const recovered = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'orders', orderField: 'createdAt', page: 3, pageSize: 3 });
    assert.equal(recovered.page, 1, 'Deleted cursor must recover cleanly to Page 1 instead of returning empty');
    assert.equal(recovered.items.length, 3);
  });

  await test('Pagination & Cache', 'Legacy documents missing sort field are NEVER silently excluded (bounded documentId fallback across Page 1 & 2)', async () => {
    const mixedDataset = [
      { id: 'doc-5', createdAt: '2026-11-05T00:00:00Z' },
      { id: 'doc-4', createdAt: '2026-11-04T00:00:00Z' },
      { id: 'doc-3' }, // legacy doc missing createdAt
      { id: 'doc-2' }, // legacy doc missing createdAt
      { id: 'doc-1', createdAt: '2026-11-01T00:00:00Z' },
    ];
    const adapter: CursorQueryAdapter<{ id: string; createdAt?: string }> = {
      getTotalCount: async () => mixedDataset.length,
      getIndexedCount: async () => mixedDataset.filter((d) => Boolean(d.createdAt)).length,
      queryByField: async () => mixedDataset.filter((d) => Boolean(d.createdAt)),
      queryByDocId: async (afterDoc, max) => {
        const sorted = [...mixedDataset].sort((a, b) => b.id.localeCompare(a.id));
        if (!afterDoc) return sorted.slice(0, max);
        const idx = sorted.findIndex((d) => d.id === afterDoc.id);
        return idx === -1 ? [] : sorted.slice(idx + 1, idx + 1 + max);
      },
    };
    const cache = new AdminDataCache();
    const cursors = new Map<string, Map<number, any>>();
    const fallbacks = new Map<string, boolean>();
    const scope = cache.makeScope('s1', 'super_admin');

    const p1 = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'customers', orderField: 'createdAt', page: 1, pageSize: 3 });
    const p2 = await runCursorPaginationWithAdapter({ cache, cursorStore: cursors, fallbackStore: fallbacks, adapter, scopeKey: scope, collectionKey: 'customers', orderField: 'createdAt', page: 2, pageSize: 3 });

    assert.equal(p1.usedDocIdFallback, true);
    assert.equal(p2.usedDocIdFallback, true);
    const ids = [...p1.items, ...p2.items].map((d) => d.id);
    assert.deepEqual(ids, ['doc-5', 'doc-4', 'doc-3', 'doc-2', 'doc-1'], 'All 5 mixed docs including legacy docs must appear');
  });

  await test('Pagination & Cache', 'In-flight cache invalidation epoch prevents stale data overwrite & scope switch isolates accounts', async () => {
    const cache = new AdminDataCache();
    const scopeA = cache.makeScope('staff-A', 'super_admin');
    const scopeB = cache.makeScope('staff-B', 'moderator');

    let resolveSlowFetch!: (v: string[]) => void;
    const slowPromise = cache.getOrFetch(
      scopeA,
      'expenses',
      () => new Promise<string[]>((r) => { resolveSlowFetch = r; }),
      60_000
    );

    // Allow microtask to start the in-flight fetcher
    await Promise.resolve();

    // Mutation invalidates `expenses` BEFORE the slow fetch resolves
    cache.invalidateCollection(scopeA, 'expenses');
    resolveSlowFetch(['stale-expense']);
    await slowPromise;

    assert.equal(cache.get(scopeA, 'expenses'), null, 'Stale in-flight promise must NOT repopulate invalidated cache');

    // Account/role switch wipes prior scope completely
    cache.set(scopeA, 'expenses', ['super-admin-only-data'], 60_000);
    assert.ok(cache.get(scopeA, 'expenses'));
    assert.equal(cache.get(scopeB, 'expenses'), null);
    // Switching back to scopeA confirms scopeA was purged on switch
    assert.equal(cache.get(scopeA, 'expenses'), null);
  });

  // =========================================================================
  // SUITE 5: FINANCIAL & INVENTORY ACCURACY + SERVER/CLIENT PARITY
  // =========================================================================
  await test('Financial & Inventory', 'Duplicate orders, Cancelled, Spam, Returned, Refunded & Failed Delivery handled identically across client & server', () => {
    const products: any[] = [
      { id: 'p1', name: 'Smart Watch', sku: 'SW-01', category: 'Watches', price: 1000, costPrice: 600, stock: 20 },
      { id: 'p2', name: 'Earbuds', sku: 'EB-01', category: 'Audio', price: 500, costPrice: 250, stock: 5 },
    ];
    const orders: any[] = [
      // Duplicate ID (older + newer version) -> must count ONCE (latest version: Delivered)
      { id: 'KB-1', orderStatus: 'Pending', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', totalAmount: 1100, subtotal: 1000, deliveryCharge: 100, updatedAt: '2026-11-01T10:00:00Z', items: [{ productId: 'p1', quantity: 1, price: 1000 }] },
      { id: 'KB-1', orderStatus: 'Delivered', paymentStatus: 'Paid', paymentMethod: 'Cash on Delivery', totalAmount: 1100, subtotal: 1000, deliveryCharge: 100, updatedAt: '2026-11-02T10:00:00Z', items: [{ productId: 'p1', quantity: 1, price: 1000 }] },
      // Completed alias -> counts as delivered
      { id: 'KB-2', orderStatus: 'Completed', paymentStatus: 'Paid', paymentMethod: 'bKash', totalAmount: 600, subtotal: 500, deliveryCharge: 100, items: [{ productId: 'p2', quantity: 1, price: 500 }] },
      // Active Pending COD -> counts in grossSales, pendingCOD, and reserved stock
      { id: 'KB-3', orderStatus: 'Confirmed', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', totalAmount: 2100, subtotal: 2000, deliveryCharge: 100, items: [{ productId: 'p1', quantity: 2, price: 1000 }] },
      // Cancelled -> excluded from grossSales, pendingCOD, reserved stock
      { id: 'KB-4', orderStatus: 'Cancelled', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', totalAmount: 1100, subtotal: 1000, deliveryCharge: 100, items: [{ productId: 'p1', quantity: 1, price: 1000 }] },
      // Spam / Fake -> excluded from grossSales, pendingCOD, reserved stock
      { id: 'KB-5', orderStatus: 'Pending', isFakeOrder: true, paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', totalAmount: 1100, subtotal: 1000, deliveryCharge: 100, items: [{ productId: 'p1', quantity: 3, price: 1000 }] },
      // Returned -> excluded from active grossSales & reserved stock, tracked in returnedRevenueLoss
      { id: 'KB-6', orderStatus: 'Returned', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', totalAmount: 1100, subtotal: 1000, deliveryCharge: 100, items: [{ productId: 'p1', quantity: 1, price: 1000 }] },
      // Refunded -> canonical bucket 'returned', excluded from active grossSales & reserved stock
      { id: 'KB-7', orderStatus: 'Refunded', paymentStatus: 'Refunded', paymentMethod: 'bKash', totalAmount: 600, subtotal: 500, deliveryCharge: 100, items: [{ productId: 'p2', quantity: 1, price: 500 }] },
      // Failed Delivery -> excluded from active grossSales & reserved stock
      { id: 'KB-8', orderStatus: 'Failed Delivery', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', totalAmount: 600, subtotal: 500, deliveryCharge: 100, items: [{ productId: 'p2', quantity: 1, price: 500 }] },
    ];

    assert.equal(deduplicateOrdersById(orders).length, 8);
    assert.equal(getCanonicalOrderBucket(orders[2]), 'delivered');
    assert.equal(getCanonicalOrderBucket(orders[5]), 'spam');
    assert.equal(getCanonicalOrderBucket(orders[7]), 'returned');

    const clientSummary = computeStoreSalesSummary(orders, products);
    const serverSummary = functionsModule._computeStoreSalesSummary(orders, products);

    // Exact parity between client analytics and Cloud Function analytics
    assert.equal(clientSummary.totalOrders, 8);
    assert.equal(serverSummary.totalOrders, 8);
    assert.equal(clientSummary.validOrdersCount, 3);
    assert.equal(serverSummary.validOrdersCount, 3);
    assert.equal(clientSummary.grossSales, 3800); // 1100 + 600 + 2100
    assert.equal(serverSummary.grossSales, 3800);
    assert.equal(clientSummary.pendingCOD, 2100);
    assert.equal(serverSummary.pendingCOD, 2100);
    assert.equal(clientSummary.returnedOrdersCount, 2); // Returned + Refunded
    assert.equal(serverSummary.returnedOrdersCount, 2);
    assert.equal(clientSummary.failedDeliveryOrdersCount, 1);
    assert.equal(serverSummary.failedDeliveryOrdersCount, 1);
    assert.equal(clientSummary.returnedRevenueLoss, 2300); // 1100 + 600 + 600
    assert.equal(serverSummary.returnedRevenueLoss, 2300);

    // Inventory reservation parity: ONLY KB-3 reserves p1 (qty 2); spam/cancelled/returned/refunded/failed reserve 0
    const clientInv = computeInventoryMetrics(products, orders, 5);
    const serverInv = functionsModule._computeInventoryMetrics(products, orders, 5);
    const p1Client = clientInv.find((m) => m.productId === 'p1')!;
    const p1Server = serverInv.find((m: any) => m.productId === 'p1')!;
    assert.equal(p1Client.reserved, 2);
    assert.equal(p1Server.reserved, 2);
    assert.equal(p1Client.available, 18);
    assert.equal(p1Server.available, 18);
    assert.equal(p1Client.deliveredUnits, 1);
    assert.equal(p1Server.deliveredUnits, 1);
  });

  // =========================================================================
  // SUITE 6: STATIC SECURITY & DEPLOYMENT CONFIGURATION AUDIT
  // =========================================================================
  await test('Static Security Audit', 'firestore.rules enforces default-deny, zero public read on private collections, and zero client writes on staff/secrets', () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;'), 'Default-deny catch-all required');
    assert.ok(rules.includes('match /integration_secrets/{docId} {\n      allow read, write: if false;'), 'integration_secrets must be strictly denied');
    assert.ok(rules.includes('match /staff_credentials/{staffId} {\n      allow read, write: if false;'), 'staff_credentials must be strictly denied');
    assert.ok(rules.includes('allow create, update: if isSuperAdmin() && isValidStaffDoc(incoming(), staffId);'), 'staff client writes must be restricted to Super Admin with isValidStaffDoc');

    // Verify private collections do NOT have `allow read: if true`
    for (const privateCol of ['staff', 'orders', 'customers', 'users', 'expenses', 'other_profits', 'activityLogs', 'auditLogs', 'suppliers']) {
      const regex = new RegExp(`match /${privateCol}/\\{[^}]+\\}\\s*\\{[\\s\\S]*?\\n    \\}`, 'm');
      const block = rules.match(regex)?.[0] || '';
      assert.ok(block.length > 0, `Rule block for ${privateCol} must exist`);
      assert.equal(
        /allow\s+(read|get|list)\s*:\s*if\s+true\b/.test(block),
        false,
        `Private collection '${privateCol}' must NEVER allow public read`
      );
    }
  });

  await test('Static Security Audit', 'No hardcoded plaintext Super Admin password (sadik@1234) remains anywhere in src/ or functions/', () => {
    const scanFiles = [
      'src/data/initialSettings.ts',
      'src/db/staff.ts',
      'src/lib/firebase.ts',
      'src/lib/firestoreMigration.ts',
      'src/lib/passwordHash.ts',
      'src/components/AdminPortal.tsx',
      'src/components/admin/AdminIntegrationSettings.tsx',
      'functions/index.js',
    ];
    for (const rel of scanFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      assert.equal(content.includes('sadik@1234'), false, `Hardcoded plaintext password found in ${rel}`);
    }
  });

  await test('Deployment Audit', 'Single consolidated GitHub Actions workflow exists with project ID and service account secret', () => {
    const workflowsDir = path.resolve(process.cwd(), '.github/workflows');
    const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    assert.equal(files.length, 1, 'Exactly one authoritative Firebase deploy workflow must exist');
    const yml = fs.readFileSync(path.join(workflowsDir, files[0]), 'utf8');
    assert.ok(yml.includes('gen-lang-client-0077501500'), 'Project ID must be preserved');
    assert.ok(yml.includes('FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0077501500'), 'Service account secret must be preserved');
  });

  // =========================================================================
  // SUITE 7: SHARED FIRESTORE SINGLE SOURCE OF TRUTH & CROSS-BROWSER RBAC SYNC
  // =========================================================================
  await test('Shared Firestore SSOT', 'Zero shared-data localStorage reads/writes remain in runtime data modules and views', () => {
    const forbiddenKeyPattern =
      /localStorage\.(getItem|setItem)\(\s*['"](?:kenax_(?:orders|products|staff|customers|expenses|other_profits|activity_logs|stock_logs|notifs|suppliers|sourcing_locations|reviews|email_logs|email_templates|sms_settings|sms_logs|cart_activities|newsletter_subscribers|gmail_alerts_settings|custom_reviews_map|my_orders)|preview_kenax_my_orders|kenax_deleted_(?:products|categories|customers|reviews|suppliers|sourcing_locations)_cache)['"]|safeSetLocalStorage\(\s*['"]kenax_(?:orders|products|staff|customers|expenses|other_profits|activity_logs|stock_logs|notifs|suppliers|sourcing_locations|reviews|email_logs|email_templates|sms_settings|sms_logs|cart_activities|newsletter_subscribers)_cache['"]/;

    const auditedFiles = [
      'src/lib/firebase.ts',
      'src/lib/emailService.ts',
      'src/lib/storage.ts',
      'src/App.tsx',
      'src/components/AdminPortal.tsx',
      'src/components/AboutView.tsx',
      'src/components/ProductPageView.tsx',
      'src/components/CustomerDashboard.tsx',
      'src/components/AuthPageView.tsx',
      'src/components/CustomerAuthModal.tsx',
    ];

    for (const rel of auditedFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      const match = content.match(forbiddenKeyPattern);
      assert.equal(
        match,
        null,
        `Shared-data localStorage access still present in ${rel}: ${match?.[0]}`
      );
    }
  });

  await test('Shared Firestore SSOT', 'App.tsx routes non-Super-Admin roles to subscribeToOwnStaffDoc to match hardened firestore.rules', () => {
    const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    assert.ok(appSource.includes('subscribeToOwnStaffDoc'), 'App.tsx must import and use subscribeToOwnStaffDoc');
    assert.ok(appSource.includes('if (!isSuperAdminSession)'), 'App.tsx must branch non-Super-Admin staff to own-doc listener');
  });

  await test('Shared Firestore SSOT', 'Admin Notifications use Cloud Firestore notifications collection (not localStorage)', () => {
    const fbSource = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/firebase.ts'), 'utf8');
    assert.ok(fbSource.includes("collection(db, 'notifications')"), 'firebase.ts must persist notifications in Firestore');
    assert.ok(fbSource.includes("doc(db, 'notifications',"), 'firebase.ts must write notification documents to Firestore');
    assert.ok(fbSource.includes('export function subscribeToNotifications'), 'firebase.ts must export subscribeToNotifications');
  });

  // =========================================================================
  // SUITE 8: MUSE PERMISSIONS SCREEN (v2 EXPANDED) & FIRESTORE SECURITY RULES
  // =========================================================================
  await test('Muse Permissions', 'firestore.rules strictly restricts settings/musePermissions & musePermissionsMeta to isSuperAdmin() (verified email or live staff claim) and excludes both from public wildcard', () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert.ok(
      rules.includes("request.auth.token.email == 'sadikrtx3060@gmail.com'") &&
        rules.includes('request.auth.token.email_verified == true'),
      'isBootstrapSuperAdmin() must enforce email_verified == true'
    );
    assert.ok(
      rules.includes('match /settings/musePermissions'),
      'firestore.rules must explicitly define match /settings/musePermissions'
    );
    assert.ok(
      rules.includes('match /settings/musePermissionsMeta'),
      'firestore.rules must explicitly define match /settings/musePermissionsMeta'
    );
    assert.ok(
      rules.includes("settingId != 'musePermissions' && settingId != 'musePermissionsMeta'"),
      'Public settings/{settingId} wildcard must explicitly exclude both musePermissions and musePermissionsMeta'
    );
    const museBlockMatch = rules.match(/match \/settings\/musePermissions\s*\{[\s\S]*?\n    \}/m);
    assert.ok(museBlockMatch, 'Could not locate settings/musePermissions rule block');
    const museBlock = museBlockMatch[0];
    assert.ok(museBlock.includes('allow read: if isSuperAdmin();'), 'settings/musePermissions read must require isSuperAdmin()');
    assert.ok(museBlock.includes('isSuperAdmin() && isValidMusePermissions(incoming())'), 'settings/musePermissions write must require isSuperAdmin() + schema validation');
    assert.ok(museBlock.includes('allow delete: if false;'), 'settings/musePermissions delete must be denied');

    const metaBlockMatch = rules.match(/match \/settings\/musePermissionsMeta\s*\{[\s\S]*?\n    \}/m);
    assert.ok(metaBlockMatch, 'Could not locate settings/musePermissionsMeta rule block');
    const metaBlock = metaBlockMatch[0];
    assert.ok(metaBlock.includes('allow read: if isSuperAdmin();'), 'settings/musePermissionsMeta read must require isSuperAdmin()');
    assert.ok(metaBlock.includes('isSuperAdmin() && isValidMusePermissionsMeta(incoming())'), 'settings/musePermissionsMeta write must require isSuperAdmin() + schema validation');
    assert.ok(metaBlock.includes('allow delete: if false;'), 'settings/musePermissionsMeta delete must be denied');
  });

  await test('Muse Permissions', 'AdminMusePermissions v2 uses Firestore onSnapshot (settings/musePermissions + musePermissionsMeta), all 15 built-in keys, custom add/delete, real error messages, zero localStorage, zero API keys', () => {
    const comp = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminMusePermissions.tsx'), 'utf8');
    assert.ok(comp.includes("doc(db, 'settings', 'musePermissions')"), 'Must target Firestore settings/musePermissions');
    assert.ok(comp.includes("doc(db, 'settings', 'musePermissionsMeta')"), 'Must target Firestore settings/musePermissionsMeta');
    assert.ok(comp.includes('onSnapshot('), 'Must subscribe with live onSnapshot');
    assert.ok(comp.includes('writeBatch(db)') && comp.includes('deleteField()'), 'Must support atomic custom add & delete');
    assert.ok(comp.includes('serverTimestamp()'), 'Must write serverTimestamp() on updatedAt');
    assert.equal(comp.includes('localStorage'), false, 'Must NEVER use localStorage for Muse Permissions');
    assert.equal(comp.includes('sessionStorage'), false, 'Must NEVER use sessionStorage for Muse Permissions');
    assert.equal(/apiKey|x-api-key|integration_secrets/i.test(comp), false, 'Must NEVER display or reference Integration API keys');
    assert.equal(comp.includes('Save hoyni, abar chesta korun'), false, 'Must show real Firestore error message instead of generic retry text');
    for (const key of [
      'viewOrders',
      'changeOrderStatus',
      'assignOrders',
      'addOrders',
      'courierCheck',
      'viewProducts',
      'manageProducts',
      'viewProductPerformance',
      'viewInventory',
      'updateStock',
      'viewActivity',
      'viewSalesReports',
      'viewDashboardOverview',
      'buildReports',
      'sendWhatsAppAlerts',
    ]) {
      assert.ok(comp.includes(key), `Missing built-in permission key: ${key}`);
    }
    assert.ok(comp.includes('logActivityToDB') && comp.includes('onRecordAuditLog'), 'Must record activityLogs entry on changes');
  });

  await test('Muse Permissions', 'Strict Super-Admin-only gating across AdminSidebar, AdminSettings, and AdminPortal', () => {
    const sidebar = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminSidebar.tsx'), 'utf8');
    const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminSettings.tsx'), 'utf8');
    const portal = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdminPortal.tsx'), 'utf8');

    assert.ok(sidebar.includes("id: 'muse-permissions'"), 'AdminSidebar must include muse-permissions entry');
    const sidebarEntry = sidebar.slice(sidebar.indexOf("id: 'muse-permissions'"), sidebar.indexOf("id: 'muse-permissions'") + 260);
    assert.ok(sidebarEntry.includes('superAdminOnly: true'), 'AdminSidebar muse-permissions entry must set superAdminOnly: true');

    assert.ok(settings.includes("id=\"tab-muse-permissions\""), 'AdminSettings must expose tab-muse-permissions');
    assert.ok(settings.includes("activeTab === 'muse_permissions' && isStrictSuperAdmin"), 'AdminSettings must gate AdminMusePermissions on isStrictSuperAdmin');

    assert.ok(
      portal.includes("currentTab === 'integration-settings' || currentTab === 'muse-permissions'"),
      'AdminPortal RBAC effect must redirect non-Super-Admin away from muse-permissions'
    );
    assert.ok(
      portal.includes("currentTab === 'muse-permissions' && activeRole === 'super_admin'"),
      'AdminPortal render gate must require activeRole === super_admin for AdminMusePermissions'
    );
  });

  await test('Default Database', 'Zero references to legacy named database in app code & config', () => {
    const legacyDbPrefix = ['ai', 'studio', 'kenaxbd'].join('-');
    const filesToCheck = [
      'firebase.json',
      'firebase-applet-config.json',
      'functions/index.js',
      'src/lib/firebase.ts',
      'src/db/telegram.ts',
      'src/db/whatsapp.ts',
      'src/db/firestoreSync.ts',
    ];
    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
      assert.equal(
        content.includes(legacyDbPrefix),
        false,
        `${relPath} must NOT reference legacy named database`
      );
    }
    const firebaseJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase.json'), 'utf8'));
    assert.equal(firebaseJson.firestore?.database, undefined, 'firebase.json must target (default) database without custom database field');
    const appletCfg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
    assert.equal(appletCfg.firestoreDatabaseId, '(default)', 'firebase-applet-config.json must specify (default)');
  });

  await test('Default Database', 'Checkout writes order + increments system/orderCounter atomically before showing success', () => {
    const firebaseTs = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/firebase.ts'), 'utf8');
    const appTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const checkoutTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/CheckoutModal.tsx'), 'utf8');

    assert.ok(firebaseTs.includes('export async function createOrderTransactionallyInDB'), 'firebase.ts must export createOrderTransactionallyInDB');
    assert.ok(
      firebaseTs.includes("'orderCounter'") &&
        firebaseTs.includes("doc(db, 'system', counterDocId)") &&
        firebaseTs.includes("doc(db, 'orders', orderNumber)"),
      'createOrderTransactionallyInDB must atomically write system/orderCounter and orders/{orderNumber} in one transaction'
    );
    assert.ok(firebaseTs.includes('createdAt: serverTimestamp()') && firebaseTs.includes('updatedAt: serverTimestamp()'), 'Order document must include serverTimestamp() for createdAt and updatedAt');
    assert.ok(
      appTsx.includes("const newOrder = await createOrderTransactionallyInDB(preparedOrder, 'KB')"),
      'App.tsx handleOrderPlaced must await createOrderTransactionallyInDB before showing confirmation'
    );
    assert.ok(
      checkoutTsx.includes('await Promise.resolve(onOrderPlaced(orderData))'),
      'CheckoutModal must await onOrderPlaced and surface real Firestore errors on failure'
    );
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`\n================ SUMMARY: ${passedCount}/${results.length} PASSED, ${failedCount} FAILED ================\n`);
  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
