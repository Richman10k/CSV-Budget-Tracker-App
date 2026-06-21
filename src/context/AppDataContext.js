/**
 * AppDataContext.js — the single source of truth for app state.
 *
 * Owns: lock/unlock state, settings, the decrypted in-memory dataset
 * (transactions / subscriptions / budgets), and all the actions that mutate
 * persisted data. Also implements auto-lock (inactivity timer + lock on
 * background) and clears decrypted data + the crypto key cache on lock.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {AppState} from 'react-native';

import TransactionModel from '../data/TransactionModel';
import SubscriptionModel from '../data/SubscriptionModel';
import BudgetModel from '../data/BudgetModel';
import RecurringPatternModel from '../data/RecurringPatternModel';
import {wipeDatabase} from '../data/Database';
import {getSettings, saveSettings} from '../encryption/SecureStorage';
import {clearKeyCache, neutralizeFormula} from '../encryption/Crypto';
import {pickCsvFile, saveCsvFile} from '../csv/FileImporter';
import {parseCSV} from '../csv/CSVParser';
import {runDetection, summarizeSubscriptions} from '../subscriptions/SubscriptionDetector';
import {runHealthCheck, fixHealth} from '../automations/healthCheck';
import {
  pickReceipt,
  saveEncrypted,
  resolveForView,
  deleteReceipt,
  cleanupOrphans,
} from '../automations/receiptStore';
import {generateInsights} from '../insights/generateInsights';
import {buildReportHtml} from '../insights/monthlyReport';
import {updateWidget} from '../widgets/widget';
import {formatCurrency, formatSigned} from '../utils/formatCurrency';
import {formatISODate, formatMonthYear, formatShortDate} from '../utils/formatDate';

const AppDataContext = createContext(null);

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within <AppDataProvider>');
  }
  return ctx;
}

function csvEscape(value) {
  const s = String(value == null ? '' : value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildExportCsv(transactions) {
  const header = 'Date,Description,Amount,Type,Category,Balance';
  const lines = transactions.map(t =>
    [
      formatISODate(t.date),
      neutralizeFormula(t.description),
      (t.type === 'expense' ? -t.amount : t.amount).toFixed(2),
      t.type,
      neutralizeFormula(t.category || ''),
      t.balance == null ? '' : Number(t.balance).toFixed(2),
    ]
      .map(csvEscape)
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export function AppDataProvider({children}) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [settings, setSettings] = useState({
    biometricsEnabled: true,
    autoLockSeconds: 0, // Off by default (still locks on close/reopen)
    lockOnBackground: true,
    currency: 'USD',
  });

  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [busy, setBusy] = useState(null); // label for in-flight long ops
  const [health, setHealth] = useState(null); // last data-health report

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  // Refs mirror state for use inside long-lived listeners/timers.
  const unlockedRef = useRef(false);
  const settingsRef = useRef(settings);
  const activityTimer = useRef(null);
  // When true, the next "app went to background" is ignored for locking. Used
  // around the system file picker so importing a CSV doesn't lock the app.
  const suppressLockRef = useRef(false);
  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load persisted settings on startup (needed by the LockScreen).
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      setReady(true);
    })();
  }, []);

  /**
   * Reload the decrypted dataset from the database. When `autoSelectMonth` is
   * true (on unlock / after import) we jump the month view to the most recent
   * month that actually has data, so screens aren't blank when the imported
   * data is from a different month than today.
   */
  const refreshAll = useCallback(async (autoSelectMonth = false) => {
    const [tx, subs, budgetMap] = await Promise.all([
      TransactionModel.getAll(),
      SubscriptionModel.getAll(),
      BudgetModel.getMap(),
    ]);
    setTransactions(tx);
    setSubscriptions(subs);
    setBudgets(budgetMap);
    if (autoSelectMonth && tx.length > 0) {
      const latest = tx.reduce((m, t) => (t.date > m ? t.date : m), 0);
      const d = new Date(latest);
      setSelectedMonth({year: d.getFullYear(), month: d.getMonth()});
    }
  }, []);

  /** Lock the app: wipe decrypted data from memory + forget crypto keys. */
  const lock = useCallback(() => {
    if (activityTimer.current) {
      clearTimeout(activityTimer.current);
      activityTimer.current = null;
    }
    setUnlocked(false);
    setTransactions([]);
    setSubscriptions([]);
    setBudgets({});
    clearKeyCache();
    // Hide financial data from the home-screen widget while locked.
    updateWidget({net: '•••', netColor: '#A2A8B4', topCategory: 'Locked', progress: 0});
  }, []);

  /** Restart the inactivity countdown (called on user interaction). */
  const resetActivity = useCallback(() => {
    if (!unlockedRef.current) {
      return;
    }
    if (activityTimer.current) {
      clearTimeout(activityTimer.current);
      activityTimer.current = null;
    }
    // autoLockSeconds === 0 means "Off" — no inactivity auto-lock.
    const secs = settingsRef.current.autoLockSeconds;
    if (!secs || secs <= 0) {
      return;
    }
    activityTimer.current = setTimeout(() => lock(), secs * 1000);
  }, [lock]);

  /** Unlock + load data. */
  const unlock = useCallback(async () => {
    setUnlocked(true);
    unlockedRef.current = true;
    await refreshAll(true);
    resetActivity();
    // Background, non-blocking data-health check after the UI is ready.
    runHealthCheck()
      .then(setHealth)
      .catch(() => {});
  }, [refreshAll, resetActivity]);

  // Lock when the app goes to the background (so closing + reopening always
  // requires the PIN/biometric), EXCEPT while the in-app file picker is open.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        // Returned to the foreground — clear any one-shot lock suppression.
        suppressLockRef.current = false;
        return;
      }
      if (suppressLockRef.current) {
        // Backgrounded by our own file picker; don't lock.
        return;
      }
      if (unlockedRef.current && settingsRef.current.lockOnBackground) {
        lock();
      }
    });
    return () => sub.remove();
  }, [lock]);

  /* ----------------------------- Actions ----------------------------- */

  const importCsv = useCallback(async () => {
    // Opening the system file picker backgrounds our app; suppress the
    // lock-on-background so the user stays on their current screen.
    suppressLockRef.current = true;
    setBusy('Importing…');
    try {
      const res = await pickCsvFile();
      if (res.cancelled) {
        return {cancelled: true};
      }
      const parsed = parseCSV(res.content);
      let stats = {received: 0, inserted: 0, skipped: 0};
      if (parsed.transactions.length > 0) {
        stats = await TransactionModel.insertMany(parsed.transactions);
        await runDetection();
        await refreshAll(true);
      }
      return {
        cancelled: false,
        fileName: res.fileName,
        ...stats,
        errors: parsed.errors,
      };
    } finally {
      setBusy(null);
      // Safety net in case the foreground event was missed.
      setTimeout(() => {
        suppressLockRef.current = false;
      }, 1500);
      resetActivity();
    }
  }, [refreshAll, resetActivity]);

  const addTransaction = useCallback(
    async tx => {
      await TransactionModel.insert(tx);
      await refreshAll();
    },
    [refreshAll],
  );

  const updateTransaction = useCallback(
    async (id, patch) => {
      await TransactionModel.update(id, patch);
      await refreshAll();
    },
    [refreshAll],
  );

  const deleteTransaction = useCallback(
    async id => {
      await TransactionModel.remove(id);
      await refreshAll();
    },
    [refreshAll],
  );

  /* ----------------------------- Receipts ---------------------------- */

  // Attach an encrypted photo/PDF receipt to a transaction. Opening the picker
  // backgrounds the app, so suppress lock-on-background like CSV import does.
  const attachReceipt = useCallback(
    async txId => {
      suppressLockRef.current = true;
      try {
        const picked = await pickReceipt();
        if (picked.cancelled) {
          return {cancelled: true};
        }
        const meta = await saveEncrypted(picked.path, picked.ext);
        await TransactionModel.setReceipt(txId, meta);
        await refreshAll();
        return {cancelled: false};
      } finally {
        setTimeout(() => {
          suppressLockRef.current = false;
        }, 1500);
        resetActivity();
      }
    },
    [refreshAll, resetActivity],
  );

  const removeReceipt = useCallback(
    async (txId, meta) => {
      await deleteReceipt(meta);
      await TransactionModel.setReceipt(txId, null);
      await refreshAll();
    },
    [refreshAll],
  );

  // Decrypt a receipt to a temp file and return a viewable file:// URI.
  const resolveReceipt = useCallback(meta => resolveForView(meta), []);

  const addSubscription = useCallback(
    async sub => {
      await SubscriptionModel.insert({...sub, autoDetected: false});
      await refreshAll();
    },
    [refreshAll],
  );

  const updateSubscription = useCallback(
    async (id, patch) => {
      await SubscriptionModel.update(id, patch);
      await refreshAll();
    },
    [refreshAll],
  );

  const setSubscriptionStatus = useCallback(
    async (id, status) => {
      await SubscriptionModel.setStatus(id, status);
      await refreshAll();
    },
    [refreshAll],
  );

  const deleteSubscription = useCallback(
    async id => {
      await SubscriptionModel.remove(id);
      await refreshAll();
    },
    [refreshAll],
  );

  // "Ignore as recurring": record the merchant pattern so detection excludes it
  // going forward, then drop the current subscription entry.
  const ignoreAsRecurring = useCallback(
    async sub => {
      await RecurringPatternModel.ignore({
        merchantKey: sub.merchantKey,
        amount: sub.amount,
        interval: sub.interval,
      });
      await SubscriptionModel.remove(sub.id);
      await refreshAll();
    },
    [refreshAll],
  );

  const setBudget = useCallback(
    async (category, limit) => {
      await BudgetModel.setLimit(category, limit);
      await refreshAll();
    },
    [refreshAll],
  );

  const applyBudgets = useCallback(
    async entries => {
      if (!entries || entries.length === 0) {
        return;
      }
      await BudgetModel.setLimitMany(entries);
      await refreshAll();
    },
    [refreshAll],
  );

  const removeBudget = useCallback(
    async category => {
      await BudgetModel.remove(category);
      await refreshAll();
    },
    [refreshAll],
  );

  const rerunDetection = useCallback(async () => {
    setBusy('Scanning…');
    try {
      await runDetection();
      await refreshAll();
    } finally {
      setBusy(null);
    }
  }, [refreshAll]);

  const exportData = useCallback(async () => {
    const content = buildExportCsv(transactions);
    const fileName = `csvbudget-export-${formatISODate(Date.now())}.csv`;
    return saveCsvFile(fileName, content);
  }, [transactions]);

  const clearAllData = useCallback(async () => {
    await wipeDatabase();
    await refreshAll();
  }, [refreshAll]);

  const checkHealth = useCallback(async () => {
    const report = await runHealthCheck();
    setHealth(report);
    return report;
  }, []);

  const repairData = useCallback(async () => {
    setBusy('Optimizing…');
    try {
      // Clean up encrypted receipt blobs no longer referenced by a transaction.
      const referenced = new Set(
        transactions.filter(t => t.receipt && t.receipt.id).map(t => t.receipt.id),
      );
      await cleanupOrphans(referenced);
      const report = await fixHealth();
      setHealth(report);
      return report;
    } finally {
      setBusy(null);
    }
  }, [transactions]);

  const updateSettings = useCallback(async patch => {
    const merged = await saveSettings(patch);
    setSettings(merged);
    settingsRef.current = merged;
    return merged;
  }, []);

  /* ----------------------------- Derived ----------------------------- */

  const monthData = useMemo(() => {
    const inMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return (
        d.getFullYear() === selectedMonth.year &&
        d.getMonth() === selectedMonth.month
      );
    });
    let spending = 0;
    let income = 0;
    const categoryTotals = {};
    inMonth.forEach(t => {
      if (t.type === 'expense') {
        spending += t.amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      } else {
        income += t.amount;
      }
    });
    const categories = Object.keys(categoryTotals)
      .map(name => ({name, amount: categoryTotals[name]}))
      .sort((a, b) => b.amount - a.amount);
    return {transactions: inMonth, spending, income, categories};
  }, [transactions, selectedMonth]);

  const subscriptionSummary = useMemo(
    () => summarizeSubscriptions(subscriptions),
    [subscriptions],
  );

  // Earliest/latest month that actually has transaction data, so the month
  // switcher can stop at the edges of the imported CSV instead of wandering
  // into empty months. null when there's no data.
  const dataMonthRange = useMemo(() => {
    if (transactions.length === 0) {
      return null;
    }
    let min = Infinity;
    let max = -Infinity;
    transactions.forEach(t => {
      if (t.date < min) {
        min = t.date;
      }
      if (t.date > max) {
        max = t.date;
      }
    });
    const lo = new Date(min);
    const hi = new Date(max);
    return {
      min: {year: lo.getFullYear(), month: lo.getMonth()},
      max: {year: hi.getFullYear(), month: hi.getMonth()},
    };
  }, [transactions]);

  /**
   * Build a shareable HTML report for the selected month (summary + insights +
   * top categories + a transaction excerpt) and save it to the device. Returns
   * the saved path. Defined here so it can read the derived monthData.
   */
  const exportMonthlyReport = useCallback(async () => {
    const currency = settingsRef.current.currency || 'USD';
    const fmt = n => formatCurrency(n, currency);
    const monthLabel = formatMonthYear(
      new Date(selectedMonth.year, selectedMonth.month, 1).getTime(),
    );
    const insights = generateInsights(transactions, subscriptions, {
      selectedMonth,
      budgets,
      fmt,
    });
    const html = buildReportHtml({
      monthLabel,
      fmt,
      spending: monthData.spending,
      income: monthData.income,
      categories: monthData.categories,
      transactions: monthData.transactions.slice(0, 40).map(t => ({
        date: formatShortDate(t.date),
        description: t.description,
        amount: t.amount,
        type: t.type,
      })),
      insights,
    });
    const fileName = `budget-report-${selectedMonth.year}-${String(
      selectedMonth.month + 1,
    ).padStart(2, '0')}.html`;
    return saveCsvFile(fileName, html);
  }, [selectedMonth, transactions, subscriptions, budgets, monthData]);

  // Keep the home-screen widget in sync with today's net + this month's top
  // category and budget usage whenever the (unlocked) dataset changes.
  useEffect(() => {
    if (!unlocked) {
      return;
    }
    const currency = settings.currency || 'USD';
    const today = new Date();
    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();
    let net = 0;
    let monthSpend = 0;
    const catTotals = {};
    transactions.forEach(t => {
      if (t.date >= startToday) {
        net += t.type === 'income' ? t.amount : -t.amount;
      }
      const d = new Date(t.date);
      if (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        t.type === 'expense'
      ) {
        monthSpend += t.amount;
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      }
    });
    const top = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];
    const totalBudget = budgets.TOTAL || 0;
    const progress =
      totalBudget > 0 ? Math.min(Math.round((monthSpend / totalBudget) * 100), 100) : 0;
    updateWidget({
      net: formatSigned(Math.abs(net), net >= 0 ? 'income' : 'expense', currency),
      netColor: net >= 0 ? '#00C853' : '#FF5252',
      topCategory: top ? `Top: ${top}` : 'No spending yet',
      progress,
    });
  }, [unlocked, transactions, budgets, settings.currency]);

  const value = {
    // state
    ready,
    unlocked,
    settings,
    busy,
    health,
    transactions,
    subscriptions,
    budgets,
    selectedMonth,
    setSelectedMonth,
    // derived
    monthData,
    subscriptionSummary,
    dataMonthRange,
    // lifecycle
    unlock,
    lock,
    resetActivity,
    // actions
    importCsv,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    attachReceipt,
    removeReceipt,
    resolveReceipt,
    addSubscription,
    updateSubscription,
    setSubscriptionStatus,
    deleteSubscription,
    ignoreAsRecurring,
    setBudget,
    applyBudgets,
    removeBudget,
    rerunDetection,
    exportData,
    exportMonthlyReport,
    clearAllData,
    checkHealth,
    repairData,
    updateSettings,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export default AppDataContext;
