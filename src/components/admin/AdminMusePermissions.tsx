import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Check, Plus, Trash2, X, LogIn, AlertCircle } from 'lucide-react';
import { db, auth, logActivityToDB, OperationType } from '../../lib/firebase';
import { StaffUser, UserRole, ActivityLog } from '../../types';

export type BuiltInMusePermissionKey =
  | 'viewOrders'
  | 'changeOrderStatus'
  | 'assignOrders'
  | 'addOrders'
  | 'courierCheck'
  | 'viewProducts'
  | 'manageProducts'
  | 'viewProductPerformance'
  | 'viewInventory'
  | 'updateStock'
  | 'viewActivity'
  | 'viewSalesReports'
  | 'viewDashboardOverview'
  | 'buildReports'
  | 'sendWhatsAppAlerts';

export type MusePermissionGroupId =
  | 'orders'
  | 'products'
  | 'inventory'
  | 'staff_activity'
  | 'reports'
  | 'alerts'
  | 'custom';

export interface MusePermissionItem {
  key: string;
  label: string;
  group: MusePermissionGroupId;
  builtIn?: boolean;
}

export interface MusePermissionGroup {
  id: MusePermissionGroupId;
  title: string;
}

export const BUILT_IN_MUSE_GROUPS: MusePermissionGroup[] = [
  { id: 'orders', title: 'Orders' },
  { id: 'products', title: 'Products' },
  { id: 'inventory', title: 'Inventory' },
  { id: 'staff_activity', title: 'Staff & Activity' },
  { id: 'reports', title: 'Reports' },
  { id: 'alerts', title: 'Alerts' },
  { id: 'custom', title: 'Custom' },
];

export const BUILT_IN_MUSE_PERMISSIONS: MusePermissionItem[] = [
  // ORDERS
  {
    key: 'viewOrders',
    label: 'View ALL orders A–Z (all statuses, fields, search & filters)',
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'changeOrderStatus',
    label: 'Change order status',
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'assignOrders',
    label: 'Assign order to staff / moderator',
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'addOrders',
    label: 'Create / add order manually',
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'courierCheck',
    label: 'View courier info & run Courier Fraud Checker',
    group: 'orders',
    builtIn: true,
  },

  // PRODUCTS
  {
    key: 'viewProducts',
    label: 'View product list',
    group: 'products',
    builtIn: true,
  },
  {
    key: 'manageProducts',
    label: 'Add new & edit existing products',
    group: 'products',
    builtIn: true,
  },
  {
    key: 'viewProductPerformance',
    label: 'View product performance (sales per product)',
    group: 'products',
    builtIn: true,
  },

  // INVENTORY
  {
    key: 'viewInventory',
    label: 'View stock levels & low-stock items',
    group: 'inventory',
    builtIn: true,
  },
  {
    key: 'updateStock',
    label: 'Update stock quantities',
    group: 'inventory',
    builtIn: true,
  },

  // STAFF & ACTIVITY
  {
    key: 'viewActivity',
    label: 'View moderator / staff activity logs',
    group: 'staff_activity',
    builtIn: true,
  },

  // REPORTS
  {
    key: 'viewSalesReports',
    label: 'View sales reports & best-selling products',
    group: 'reports',
    builtIn: true,
  },
  {
    key: 'viewDashboardOverview',
    label: 'View admin dashboard Overview',
    group: 'reports',
    builtIn: true,
  },
  {
    key: 'buildReports',
    label: 'Build analytics & summary reports (daily / weekly / monthly)',
    group: 'reports',
    builtIn: true,
  },

  // ALERTS
  {
    key: 'sendWhatsAppAlerts',
    label: 'Send WhatsApp alerts to owner',
    group: 'alerts',
    builtIn: true,
  },
];

const BUILT_IN_KEY_SET = new Set<string>(BUILT_IN_MUSE_PERMISSIONS.map((p) => p.key));
const RESERVED_KEYS = new Set<string>(['updatedAt', 'updatedBy', 'createdAt', '__proto__', 'constructor', 'prototype']);
const VALID_GROUP_IDS = new Set<string>(BUILT_IN_MUSE_GROUPS.map((g) => g.id));

function buildDefaultPermissionValues(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const item of BUILT_IN_MUSE_PERMISSIONS) {
    defaults[item.key] = true;
  }
  return defaults;
}

function normalizeGroupId(raw: unknown): MusePermissionGroupId {
  const str = String(raw || '').trim();
  if (VALID_GROUP_IDS.has(str)) return str as MusePermissionGroupId;
  return 'custom';
}

function suggestKeyFromLabel(label: string): string {
  const words = label
    .trim()
    .replace(/[^a-zA-Z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((w, idx) =>
      idx === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
    .replace(/^[^a-zA-Z]+/, '')
    .slice(0, 48);
}

function formatFirestoreError(err: unknown): string {
  if (!err) return 'Unknown Firestore error';
  const anyErr = err as { code?: string; message?: string };
  const code = typeof anyErr.code === 'string' ? anyErr.code : '';
  const message =
    typeof anyErr.message === 'string' && anyErr.message.trim()
      ? anyErr.message.trim()
      : String(err);
  if (code && !message.toLowerCase().includes(code.toLowerCase())) {
    return `${code}: ${message}`;
  }
  return message;
}

function logStructuredFirestoreError(
  err: unknown,
  operationType: OperationType,
  path: string
) {
  const errInfo = {
    error: err instanceof Error ? err.message : String(err),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

interface AdminMusePermissionsProps {
  currentUserRole?: UserRole;
  currentStaff?: StaffUser | null;
  onRecordAuditLog?: (
    action: string,
    module: string,
    targetId: string,
    details: string,
    meta?: { fromStatus?: string; toStatus?: string; staffEmail?: string }
  ) => void;
}

type RowFeedback = 'idle' | 'saving' | 'saved' | 'error';

export const AdminMusePermissions: React.FC<AdminMusePermissionsProps> = ({
  currentUserRole,
  currentStaff,
  onRecordAuditLog,
}) => {
  const isStrictSuperAdmin = currentUserRole === 'super_admin';

  // Track real Firebase Auth session (needed by Firestore Security Rules)
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);

  // Real Firestore state
  const [values, setValues] = useState<Record<string, boolean> | null>(null);
  const [customItems, setCustomItems] = useState<MusePermissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Per-row live feedback & delete confirmation
  const [rowFeedback, setRowFeedback] = useState<Record<string, RowFeedback>>({});
  const [rowErrorMessage, setRowErrorMessage] = useState<Record<string, string>>({});
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Toast status
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Permission form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');
  const [newKey, setNewKey] = useState<string>('');
  const [keyManuallyEdited, setKeyManuallyEdited] = useState<boolean>(false);
  const [newGroup, setNewGroup] = useState<MusePermissionGroupId>('orders');
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const timersRef = useRef<Record<string, number>>({});
  const bootstrapAttemptedRef = useRef<boolean>(false);
  const metaBootstrapAttemptedRef = useRef<boolean>(false);

  const clearTimer = (id: string) => {
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = {};
    };
  }, []);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    clearTimer('__toast__');
    setToast({ type, message });
    timersRef.current['__toast__'] = window.setTimeout(
      () => setToast(null),
      type === 'error' ? 6000 : 2400
    );
  }, []);

  // 1. Observe Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const actorLabel =
    firebaseUser?.email || currentStaff?.email || currentStaff?.name || 'Super Admin';

  // 2. Real-time onSnapshot subscriptions to settings/musePermissions AND settings/musePermissionsMeta
  useEffect(() => {
    if (!isStrictSuperAdmin || !authReady) return;

    // Reset bootstrap flags when Firebase auth user changes
    bootstrapAttemptedRef.current = false;
    metaBootstrapAttemptedRef.current = false;

    if (!firebaseUser) {
      // Show toggles clearly (disabled for saving until Firebase Auth connects) rather than blank screen
      setValues((prev) => prev ?? buildDefaultPermissionValues());
      setLoading(false);
      setFirestoreError(
        'Firebase Super Admin authentication is not active in this browser session. Sign in with Google to read & save live Firestore permissions.'
      );
      return;
    }

    setLoading(true);
    setFirestoreError(null);

    const permRef = doc(db, 'settings', 'musePermissions');
    const metaRef = doc(db, 'settings', 'musePermissionsMeta');

    let valuesResolved = false;

    const unsubValues = onSnapshot(
      permRef,
      (snap) => {
        valuesResolved = true;
        setFirestoreError(null);

        if (!snap.exists()) {
          const initialDefaults = buildDefaultPermissionValues();
          setValues(initialDefaults);
          setLoading(false);

          // Automatically create settings/musePermissions with every built-in key = true
          if (!bootstrapAttemptedRef.current) {
            bootstrapAttemptedRef.current = true;
            setDoc(
              permRef,
              {
                ...initialDefaults,
                updatedAt: serverTimestamp(),
                updatedBy: actorLabel,
              },
              { merge: true }
            ).catch((err) => {
              logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
              setFirestoreError(formatFirestoreError(err));
            });
          }
          return;
        }

        const data = snap.data() || {};
        const mergedValues: Record<string, boolean> = {};
        const missingBuiltIns: Record<string, boolean> = {};

        for (const item of BUILT_IN_MUSE_PERMISSIONS) {
          if (typeof data[item.key] === 'boolean') {
            mergedValues[item.key] = data[item.key];
          } else {
            mergedValues[item.key] = true;
            missingBuiltIns[item.key] = true;
          }
        }

        // Include any custom boolean keys stored in Firestore
        for (const [k, v] of Object.entries(data)) {
          if (!RESERVED_KEYS.has(k) && typeof v === 'boolean' && !(k in mergedValues)) {
            mergedValues[k] = v;
          }
        }

        setValues(mergedValues);
        setLoading(false);

        // Backfill newly added built-in keys (e.g. migrating from 7 keys to 15 keys) so Worker reads all 15
        if (Object.keys(missingBuiltIns).length > 0 && !bootstrapAttemptedRef.current) {
          bootstrapAttemptedRef.current = true;
          setDoc(
            permRef,
            {
              ...missingBuiltIns,
              updatedAt: serverTimestamp(),
              updatedBy: actorLabel,
            },
            { merge: true }
          ).catch((err) => {
            logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
            setFirestoreError(formatFirestoreError(err));
          });
        }
      },
      (err) => {
        logStructuredFirestoreError(err, OperationType.GET, 'settings/musePermissions');
        const realMessage = formatFirestoreError(err);
        setFirestoreError(realMessage);
        // Never hide toggles behind an empty error box
        if (!valuesResolved) {
          setValues((prev) => prev ?? buildDefaultPermissionValues());
        }
        setLoading(false);
      }
    );

    const unsubMeta = onSnapshot(
      metaRef,
      (snap) => {
        if (!snap.exists()) {
          setCustomItems([]);
          if (!metaBootstrapAttemptedRef.current) {
            metaBootstrapAttemptedRef.current = true;
            setDoc(
              metaRef,
              {
                permissions: BUILT_IN_MUSE_PERMISSIONS.map((p) => ({
                  key: p.key,
                  label: p.label,
                  group: p.group,
                  builtIn: true,
                })),
                groups: BUILT_IN_MUSE_GROUPS.map((g) => ({ id: g.id, title: g.title })),
                updatedAt: serverTimestamp(),
                updatedBy: actorLabel,
              },
              { merge: true }
            ).catch((err) => {
              logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissionsMeta');
            });
          }
          return;
        }

        const data = snap.data() || {};
        const rawList = Array.isArray(data.permissions) ? data.permissions : [];
        const parsedCustom: MusePermissionItem[] = [];
        const seen = new Set<string>(BUILT_IN_KEY_SET);

        for (const entry of rawList) {
          if (!entry || typeof entry !== 'object') continue;
          const k = String((entry as any).key || '').trim();
          const l = String((entry as any).label || '').trim();
          if (!k || !l || seen.has(k) || RESERVED_KEYS.has(k)) continue;
          seen.add(k);
          parsedCustom.push({
            key: k,
            label: l,
            group: normalizeGroupId((entry as any).group),
            builtIn: false,
          });
        }

        setCustomItems(parsedCustom);
      },
      (err) => {
        logStructuredFirestoreError(err, OperationType.GET, 'settings/musePermissionsMeta');
        // Surface real error if main doc didn't already report one
        setFirestoreError((prev) => prev || formatFirestoreError(err));
      }
    );

    return () => {
      unsubValues();
      unsubMeta();
    };
  }, [isStrictSuperAdmin, authReady, firebaseUser, actorLabel]);

  // Combine built-in list + custom meta entries + any orphan boolean keys in settings/musePermissions
  const allPermissions: MusePermissionItem[] = useMemo(() => {
    const list: MusePermissionItem[] = [...BUILT_IN_MUSE_PERMISSIONS, ...customItems];
    const knownKeys = new Set<string>(list.map((p) => p.key));

    if (values) {
      for (const key of Object.keys(values)) {
        if (!knownKeys.has(key) && !RESERVED_KEYS.has(key)) {
          knownKeys.add(key);
          list.push({
            key,
            label: key,
            group: 'custom',
            builtIn: false,
          });
        }
      }
    }
    return list;
  }, [customItems, values]);

  const groupedSections = useMemo(() => {
    return BUILT_IN_MUSE_GROUPS.map((group) => ({
      ...group,
      rows: allPermissions.filter((item) => item.group === group.id),
    })).filter((g) => g.rows.length > 0);
  }, [allPermissions]);

  if (!isStrictSuperAdmin) {
    return null;
  }

  const writeAudit = (
    action: string,
    targetId: string,
    details: string,
    fromStatus?: string,
    toStatus?: string
  ) => {
    if (onRecordAuditLog) {
      onRecordAuditLog(action, 'settings', targetId, details, {
        fromStatus,
        toStatus,
        staffEmail: firebaseUser?.email || currentStaff?.email,
      });
    } else {
      const logEntry: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        staffId: currentStaff?.id || 'staff-root',
        staffName: currentStaff?.name || 'Super Admin',
        staffEmail: firebaseUser?.email || currentStaff?.email || undefined,
        staffRole: 'super_admin',
        action,
        module: 'settings',
        targetId,
        fromStatus,
        toStatus,
        source: 'admin',
        details,
        timestamp: new Date().toISOString(),
      };
      logActivityToDB(logEntry).catch(() => {});
    }
  };

  const handleGoogleSuperAdminConnect = async () => {
    setIsConnectingGoogle(true);
    setFirestoreError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      showToast('success', 'Connected');
    } catch (err) {
      const msg = formatFirestoreError(err);
      setFirestoreError(msg);
      showToast('error', msg);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleToggle = async (row: MusePermissionItem) => {
    if (!values) return;
    if (rowFeedback[row.key] === 'saving') return;

    const previousValue = Boolean(values[row.key]);
    const nextValue = !previousValue;

    clearTimer(row.key);
    setValues((prev) => (prev ? { ...prev, [row.key]: nextValue } : prev));
    setRowFeedback((prev) => ({ ...prev, [row.key]: 'saving' }));
    setRowErrorMessage((prev) => {
      const next = { ...prev };
      delete next[row.key];
      return next;
    });

    try {
      const permRef = doc(db, 'settings', 'musePermissions');
      await setDoc(
        permRef,
        {
          [row.key]: nextValue,
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );

      setFirestoreError(null);
      setRowFeedback((prev) => ({ ...prev, [row.key]: 'saved' }));
      showToast('success', 'Saved');

      timersRef.current[row.key] = window.setTimeout(() => {
        setRowFeedback((prev) => ({ ...prev, [row.key]: 'idle' }));
      }, 2200);

      const fromText = previousValue ? 'ON' : 'OFF';
      const toText = nextValue ? 'ON' : 'OFF';
      writeAudit(
        'Muse Permission Updated',
        `musePermissions.${row.key}`,
        `${actorLabel} changed Muse permission "${row.label}" (${row.key}): ${fromText} → ${toText}`,
        fromText,
        toText
      );
    } catch (err) {
      logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
      const realError = formatFirestoreError(err);
      // Revert switch immediately so UI never disagrees with Firestore
      setValues((prev) => (prev ? { ...prev, [row.key]: previousValue } : prev));
      setRowFeedback((prev) => ({ ...prev, [row.key]: 'error' }));
      setRowErrorMessage((prev) => ({ ...prev, [row.key]: realError }));
      setFirestoreError(realError);
      showToast('error', realError);

      timersRef.current[row.key] = window.setTimeout(() => {
        setRowFeedback((prev) => ({ ...prev, [row.key]: 'idle' }));
      }, 6000);
    }
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    const trimmedLabel = newLabel.trim();
    const trimmedKey = newKey.trim();

    if (!trimmedLabel || trimmedLabel.length < 2) {
      setAddFormError('Label is required.');
      return;
    }
    if (trimmedLabel.length > 140) {
      setAddFormError('Label must be 140 characters or fewer.');
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]{1,48}$/.test(trimmedKey)) {
      setAddFormError('Key must start with a letter and use only letters, numbers, or underscore (2–49 chars).');
      return;
    }
    if (RESERVED_KEYS.has(trimmedKey)) {
      setAddFormError(`"${trimmedKey}" is a reserved key.`);
      return;
    }
    if (allPermissions.some((p) => p.key === trimmedKey)) {
      setAddFormError(`Permission key "${trimmedKey}" already exists.`);
      return;
    }

    setIsAdding(true);
    try {
      const nextCustomList: MusePermissionItem[] = [
        ...customItems,
        { key: trimmedKey, label: trimmedLabel, group: newGroup, builtIn: false },
      ];

      const fullMetaList = [
        ...BUILT_IN_MUSE_PERMISSIONS.map((p) => ({
          key: p.key,
          label: p.label,
          group: p.group,
          builtIn: true,
        })),
        ...nextCustomList.map((p) => ({
          key: p.key,
          label: p.label,
          group: p.group,
          builtIn: false,
        })),
      ];

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'settings', 'musePermissions'),
        {
          [trimmedKey]: true,
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );
      batch.set(
        doc(db, 'settings', 'musePermissionsMeta'),
        {
          permissions: fullMetaList,
          groups: BUILT_IN_MUSE_GROUPS.map((g) => ({ id: g.id, title: g.title })),
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );
      await batch.commit();

      setFirestoreError(null);
      setNewLabel('');
      setNewKey('');
      setKeyManuallyEdited(false);
      setShowAddForm(false);
      showToast('success', 'Saved');

      writeAudit(
        'Muse Custom Permission Added',
        `musePermissions.${trimmedKey}`,
        `${actorLabel} added custom Muse permission "${trimmedLabel}" (${trimmedKey}) in ${newGroup}`,
        'NONE',
        'ON'
      );
    } catch (err) {
      logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissionsMeta');
      const realError = formatFirestoreError(err);
      setAddFormError(realError);
      setFirestoreError(realError);
      showToast('error', realError);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCustomPermission = async (row: MusePermissionItem) => {
    if (row.builtIn || BUILT_IN_KEY_SET.has(row.key)) return;
    setDeletingKey(row.key);

    try {
      const remainingCustom = customItems.filter((item) => item.key !== row.key);
      const fullMetaList = [
        ...BUILT_IN_MUSE_PERMISSIONS.map((p) => ({
          key: p.key,
          label: p.label,
          group: p.group,
          builtIn: true,
        })),
        ...remainingCustom.map((p) => ({
          key: p.key,
          label: p.label,
          group: p.group,
          builtIn: false,
        })),
      ];

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'settings', 'musePermissions'),
        {
          [row.key]: deleteField(),
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );
      batch.set(
        doc(db, 'settings', 'musePermissionsMeta'),
        {
          permissions: fullMetaList,
          groups: BUILT_IN_MUSE_GROUPS.map((g) => ({ id: g.id, title: g.title })),
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );
      await batch.commit();

      setConfirmDeleteKey(null);
      setFirestoreError(null);
      showToast('success', 'Saved');

      writeAudit(
        'Muse Custom Permission Deleted',
        `musePermissions.${row.key}`,
        `${actorLabel} deleted custom Muse permission "${row.label}" (${row.key})`,
        values?.[row.key] ? 'ON' : 'OFF',
        'DELETED'
      );
    } catch (err) {
      logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
      const realError = formatFirestoreError(err);
      setFirestoreError(realError);
      showToast('error', realError);
    } finally {
      setDeletingKey(null);
    }
  };

  // Split groups cleanly across 2 balanced columns on desktop
  const leftColumnGroups = groupedSections.filter((g) =>
    g.id === 'orders' || g.id === 'inventory' || g.id === 'staff_activity'
  );
  const rightColumnGroups = groupedSections.filter((g) =>
    g.id === 'products' || g.id === 'reports' || g.id === 'alerts' || g.id === 'custom'
  );

  const renderGroupCard = (group: MusePermissionGroup & { rows: MusePermissionItem[] }) => (
    <section
      key={group.id}
      aria-labelledby={`muse-group-${group.id}`}
      className="w-full rounded-3xl bg-white dark:bg-stone-900 border border-amber-950/[0.07] dark:border-stone-800 shadow-[0_8px_28px_-14px_rgba(120,76,24,0.12)] px-5 sm:px-6 py-5"
    >
      <h2
        id={`muse-group-${group.id}`}
        className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 pb-3"
      >
        {group.title}
      </h2>

      <div className="divide-y divide-amber-950/[0.07] dark:divide-stone-800">
        {group.rows.map((row) => {
          const isOn = Boolean(values?.[row.key]);
          const status = rowFeedback[row.key] || 'idle';
          const isBusy = status === 'saving' || deletingKey === row.key;
          const isCustom = !row.builtIn && !BUILT_IN_KEY_SET.has(row.key);
          const isConfirmingDelete = confirmDeleteKey === row.key;
          const rowErr = rowErrorMessage[row.key];

          return (
            <div key={row.key} className="min-h-[52px] py-3">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <label
                  htmlFor={`muse-switch-${row.key}`}
                  title={row.key}
                  className="text-[14px] sm:text-[15px] font-medium text-stone-800 dark:text-stone-100 leading-snug cursor-pointer select-none min-w-0 flex-1"
                >
                  {row.label}
                </label>

                <div className="flex items-center gap-2.5 shrink-0">
                  {status === 'saving' && (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      Saving…
                    </span>
                  )}
                  {status === 'saved' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Saved
                    </span>
                  )}

                  {isCustom && !isConfirmingDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteKey(row.key)}
                      disabled={isBusy}
                      aria-label={`Delete ${row.label}`}
                      title={`Delete ${row.key}`}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    id={`muse-switch-${row.key}`}
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    aria-busy={isBusy}
                    aria-label={row.label}
                    disabled={isBusy}
                    onClick={() => handleToggle(row)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900 ${
                      isOn
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600'
                    } ${isBusy ? 'opacity-65 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                        isOn ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {status === 'error' && rowErr && (
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 break-words">
                  {rowErr}
                </p>
              )}

              {isCustom && isConfirmingDelete && (
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteKey(null)}
                    disabled={deletingKey === row.key}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomPermission(row)}
                    disabled={deletingKey === row.key}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {deletingKey === row.key ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="rounded-3xl bg-[#FAF6F0] dark:bg-stone-950/90 border border-amber-950/[0.06] dark:border-stone-800/80 p-4 sm:p-6 lg:p-8">
        {/* Top Row: Title + Toast + Add Permission Action (ZERO subtitles) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Muse Permissions
          </h1>

          <div className="flex items-center gap-2.5">
            {toast && (
              <div
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-sm ${
                  toast.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-white text-emerald-700 border border-emerald-200/80 dark:bg-stone-900 dark:text-emerald-400 dark:border-emerald-800/60'
                }`}
              >
                {toast.type === 'success' && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                <span className="max-w-[260px] sm:max-w-md truncate">{toast.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowAddForm((prev) => !prev);
                setAddFormError(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Permission</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Firestore Error / Auth Action Banner (shown ONLY when an error occurs) */}
        {firestoreError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-rose-800 dark:text-rose-200 break-words">
                {firestoreError}
              </p>
            </div>
            {(!firebaseUser || firestoreError.toLowerCase().includes('permission')) && (
              <button
                type="button"
                onClick={handleGoogleSuperAdminConnect}
                disabled={isConnectingGoogle}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isConnectingGoogle ? 'Signing in…' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        )}

        {/* Super Admin Add Permission Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddPermission}
            className="mb-6 rounded-3xl bg-white dark:bg-stone-900 border border-amber-950/[0.08] dark:border-stone-800 shadow-[0_8px_28px_-14px_rgba(120,76,24,0.12)] p-5 sm:p-6"
          >
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-4">
              Add Permission
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-5">
                <label
                  htmlFor="muse-new-label"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Label
                </label>
                <input
                  id="muse-new-label"
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewLabel(val);
                    if (!keyManuallyEdited) {
                      setNewKey(suggestKeyFromLabel(val));
                    }
                    setAddFormError(null);
                  }}
                  placeholder="Export invoices"
                  className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                />
              </div>

              <div className="md:col-span-4">
                <label
                  htmlFor="muse-new-key"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Key
                </label>
                <input
                  id="muse-new-key"
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => {
                    setKeyManuallyEdited(true);
                    setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                    setAddFormError(null);
                  }}
                  placeholder="exportInvoices"
                  className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm font-mono text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                />
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="muse-new-group"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Group
                </label>
                <select
                  id="muse-new-group"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as MusePermissionGroupId)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 cursor-pointer"
                >
                  {BUILT_IN_MUSE_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {addFormError && (
              <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400 break-words">
                {addFormError}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddFormError(null);
                }}
                className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isAdding ? 'Saving…' : 'Save Permission'}
              </button>
            </div>
          </form>
        )}

        {/* Skeleton while initial Firestore snapshot resolves */}
        {loading || !values ? (
          <div
            aria-busy="true"
            aria-label="Loading Muse Permissions"
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6"
          >
            {[5, 4].map((rowCount, colIdx) => (
              <div
                key={colIdx}
                className="rounded-3xl bg-white dark:bg-stone-900 border border-amber-950/[0.06] dark:border-stone-800 px-5 sm:px-6 py-5 space-y-3"
              >
                <div className="h-4 w-24 rounded-md bg-stone-200/80 dark:bg-stone-800 animate-pulse" />
                {Array.from({ length: rowCount }).map((_, idx) => (
                  <div key={idx} className="min-h-[52px] py-2 flex items-center justify-between gap-4">
                    <div className="h-4 w-52 rounded-md bg-stone-200/70 dark:bg-stone-800 animate-pulse" />
                    <div className="h-7 w-12 rounded-full bg-stone-200/80 dark:bg-stone-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
            <div className="space-y-5 lg:space-y-6">
              {leftColumnGroups.map((group) => renderGroupCard(group))}
            </div>
            <div className="space-y-5 lg:space-y-6">
              {rightColumnGroups.map((group) => renderGroupCard(group))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
