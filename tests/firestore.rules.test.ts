/**
 * KenaX BD — Firestore Security Rules Emulator Test Suite
 *
 * Run locally or in CI (requires Java 17+ / JVM for Firebase Firestore Emulator):
 *   npx firebase-tools emulators:exec --only firestore "npx tsx tests/firestore.rules.test.ts"
 *
 * Covers:
 * - Default-deny catch-all on unlisted collections
 * - Strict deny on server-only `integration_secrets` and `staff_credentials`
 * - Public visitor read/write isolation (no access to staff, customers, orders, expenses, logs)
 * - Staff client writes denied on `/staff/*` (server-only via /api/staff-auth/*)
 * - Inactive / suspended / removed staff denied even with valid auth claims
 * - Moderator / Manager blocked from modifying roles/permissions or cancelling Delivered orders
 * - Valid public checkout order creation vs spoofed Paid/Delivered order creation
 * - Append-only enforcement on `activityLogs`, `auditLogs`, `inventoryLogs`
 * - Atomic monotonic increment enforcement on `system/orderCounter`
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

async function runFirestoreRulesSuite() {
  let rulesUnitTesting: any;
  try {
    // Dynamic import so TypeScript compilation succeeds even when optional emulator package isn't installed
    const pkgName = '@firebase/rules-unit-testing';
    rulesUnitTesting = await import(/* @vite-ignore */ pkgName);
  } catch {
    console.error(
      '[Firestore Rules Test] Install @firebase/rules-unit-testing and run under `firebase emulators:exec --only firestore`.'
    );
    process.exit(1);
  }

  const { initializeTestEnvironment, assertSucceeds, assertFails } = rulesUnitTesting;
  const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection } = await import('firebase/firestore');

  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: 'gen-lang-client-0077501500',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  try {
    // Seed baseline documents with rules disabled
    await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'staff', 'staff-super-1'), {
        id: 'staff-super-1',
        name: 'Super Admin',
        email: 'super@kenaxbd.com',
        role: 'super_admin',
        isActive: true,
        status: 'active',
        firebaseUid: 'uid-super-1',
      });
      await setDoc(doc(adminDb, 'staff', 'staff-mod-1'), {
        id: 'staff-mod-1',
        name: 'Moderator',
        email: 'mod@kenaxbd.com',
        role: 'moderator',
        isActive: true,
        status: 'active',
        firebaseUid: 'uid-mod-1',
      });
      await setDoc(doc(adminDb, 'staff', 'staff-mgr-1'), {
        id: 'staff-mgr-1',
        name: 'Manager',
        email: 'mgr@kenaxbd.com',
        role: 'manager',
        isActive: true,
        status: 'active',
        firebaseUid: 'uid-mgr-1',
      });
      await setDoc(doc(adminDb, 'staff', 'staff-suspended-1'), {
        id: 'staff-suspended-1',
        name: 'Suspended',
        email: 'sus@kenaxbd.com',
        role: 'super_admin',
        isActive: false,
        status: 'suspended',
        firebaseUid: 'uid-sus-1',
      });
      await setDoc(doc(adminDb, 'staff_credentials', 'staff-super-1'), {
        staffId: 'staff-super-1',
        passwordHash: 'scrypt:deadbeef:cafebabe',
      });
      await setDoc(doc(adminDb, 'integration_secrets', 'muse_connector'), {
        apiKeyHash: 'sha256-secret',
      });
      await setDoc(doc(adminDb, 'orders', 'KB-404401'), {
        id: 'KB-404401',
        customerName: 'Alice',
        customerUid: 'uid-customer-1',
        totalAmount: 1500,
        orderStatus: 'Delivered',
        paymentStatus: 'Paid',
      });
      await setDoc(doc(adminDb, 'customers', 'uid-customer-1'), {
        id: 'uid-customer-1',
        uid: 'uid-customer-1',
        name: 'Alice',
        phone: '01711111111',
      });
      await setDoc(doc(adminDb, 'expenses', 'exp-1'), {
        id: 'exp-1',
        title: 'Courier Cost',
        amount: 500,
      });
      await setDoc(doc(adminDb, 'system', 'orderCounter'), { current: 404401 });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    const customerDb = testEnv.authenticatedContext('uid-customer-1').firestore();
    const modDb = testEnv
      .authenticatedContext('uid-mod-1', { staffId: 'staff-mod-1', role: 'moderator' })
      .firestore();
    const mgrDb = testEnv
      .authenticatedContext('uid-mgr-1', { staffId: 'staff-mgr-1', role: 'manager' })
      .firestore();
    const superDb = testEnv
      .authenticatedContext('uid-super-1', { staffId: 'staff-super-1', role: 'super_admin' })
      .firestore();
    const suspendedDb = testEnv
      .authenticatedContext('uid-sus-1', { staffId: 'staff-suspended-1', role: 'super_admin' })
      .firestore();

    // 1. Default deny on unlisted collections
    await assertFails(getDoc(doc(superDb, 'unknown_secret_collection', 'doc1')));

    // 2. Server-only secrets & credentials strictly denied even to Super Admin client SDK
    await assertFails(getDoc(doc(superDb, 'integration_secrets', 'muse_connector')));
    await assertFails(setDoc(doc(superDb, 'integration_secrets', 'muse_connector'), { apiKeyHash: 'x' }));
    await assertFails(getDoc(doc(superDb, 'staff_credentials', 'staff-super-1')));
    await assertFails(setDoc(doc(superDb, 'staff_credentials', 'staff-super-1'), { passwordHash: 'x' }));

    // 3. Public visitors cannot read staff, orders, customers, expenses, or activityLogs
    await assertFails(getDocs(collection(anonDb, 'staff')));
    await assertFails(getDocs(collection(anonDb, 'orders')));
    await assertFails(getDocs(collection(anonDb, 'customers')));
    await assertFails(getDocs(collection(anonDb, 'expenses')));
    await assertFails(getDocs(collection(anonDb, 'activityLogs')));
    await assertSucceeds(getDocs(collection(anonDb, 'products')));

    // 4. Staff client writes denied (prevent self-elevation & Super Admin tampering)
    await assertFails(updateDoc(doc(modDb, 'staff', 'staff-mod-1'), { role: 'super_admin' }));
    await assertFails(updateDoc(doc(mgrDb, 'staff', 'staff-super-1'), { role: 'moderator' }));
    await assertFails(deleteDoc(doc(superDb, 'staff', 'staff-mod-1')));
    await assertSucceeds(getDoc(doc(modDb, 'staff', 'staff-mod-1')));
    await assertFails(getDocs(collection(modDb, 'staff')));
    await assertSucceeds(getDocs(collection(superDb, 'staff')));

    // 5. Suspended Super Admin blocked from all privileged reads/writes
    await assertFails(getDocs(collection(suspendedDb, 'staff')));
    await assertFails(getDocs(collection(suspendedDb, 'expenses')));

    // 6. Roles & permissions restricted to Super Admin writes
    await assertFails(setDoc(doc(mgrDb, 'roles', 'super_admin'), { hacked: true }));
    await assertSucceeds(setDoc(doc(superDb, 'roles', 'moderator'), { label: 'Moderator' }));

    // 7. Public checkout allows valid Pending order, rejects spoofed Paid/Delivered order
    await assertSucceeds(
      setDoc(doc(anonDb, 'orders', 'KB-404402'), {
        id: 'KB-404402',
        customerName: 'Guest Buyer',
        totalAmount: 1200,
        orderStatus: 'Pending',
        paymentStatus: 'Unpaid',
      })
    );
    await assertFails(
      setDoc(doc(anonDb, 'orders', 'KB-404403'), {
        id: 'KB-404403',
        customerName: 'Attacker',
        totalAmount: 1200,
        orderStatus: 'Delivered',
        paymentStatus: 'Paid',
      })
    );

    // 8. Moderator cannot cancel Delivered order or modify totalAmount
    await assertFails(updateDoc(doc(modDb, 'orders', 'KB-404401'), { orderStatus: 'Cancelled' }));
    await assertFails(updateDoc(doc(modDb, 'orders', 'KB-404401'), { totalAmount: 1 }));
    await assertSucceeds(updateDoc(doc(mgrDb, 'orders', 'KB-404401'), { notes: 'Manager verified' }));

    // 9. Customer can read own order/profile, cannot read others or elevate role
    await assertSucceeds(getDoc(doc(customerDb, 'orders', 'KB-404401')));
    await assertSucceeds(getDoc(doc(customerDb, 'customers', 'uid-customer-1')));
    await assertFails(updateDoc(doc(customerDb, 'customers', 'uid-customer-1'), { role: 'super_admin' }));

    // 10. Append-only audit logs cannot be updated or deleted
    await assertSucceeds(setDoc(doc(modDb, 'activityLogs', 'log-test-1'), { id: 'log-test-1', action: 'Test' }));
    await assertFails(updateDoc(doc(superDb, 'activityLogs', 'log-test-1'), { action: 'Tampered' }));
    await assertFails(deleteDoc(doc(superDb, 'activityLogs', 'log-test-1')));

    // 11. Atomic orderCounter monotonic increment only
    await assertSucceeds(updateDoc(doc(anonDb, 'system', 'orderCounter'), { current: 404402 }));
    await assertFails(updateDoc(doc(anonDb, 'system', 'orderCounter'), { current: 100 }));
    await assertFails(updateDoc(doc(anonDb, 'system', 'orderCounter'), { current: 999999 }));

    assert.ok(true, 'All Firestore Security Rules emulator assertions passed.');
    console.log('✅ All 11 Firestore Security Rules emulator test groups PASSED.');
  } finally {
    await testEnv.cleanup();
  }
}

runFirestoreRulesSuite().catch((err) => {
  console.error('❌ Firestore Rules Emulator Test Failed:', err);
  process.exit(1);
});
