/**
 * DailyFlow 核心邏輯單元測試
 * 執行方式: node docs/test-logic.js
 */

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── 從 index.html 抽取的純函式 ─────────────────────────────

const FIXED_TODAY = new Date('2026-06-11');

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function calcStreak(checks, today = FIXED_TODAY) {
  let streak = 0;
  const d = new Date(today);
  if (!checks[dateKey(d)]) d.setDate(d.getDate() - 1);
  while (checks[dateKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function pendingSummary(tasks, todayKey) {
  const t = tasks[todayKey] || [];
  const n = t.filter(x => !x.done).length;
  return n ? `今天還有 ${n} 件待辦事項` : '今天的任務都完成了 🎉';
}

function toggleTask(tasks, k, id) {
  const task = (tasks[k] || []).find(x => x.id === id);
  if (!task) return false;
  task.done = !task.done;
  return true;
}

function deleteTask(tasks, k, id) {
  tasks[k] = (tasks[k] || []).filter(x => x.id !== id);
  if (tasks[k].length === 0) delete tasks[k];
}

function toggleHabitDay(habit, key) {
  const was = !!habit.checks[key];
  habit.checks[key] = was ? 0 : 1;
  if (!was) {
    habit.total++;
  } else {
    habit.total = Math.max(0, habit.total - 1);
  }
  habit.streak = calcStreak(habit.checks);
  return habit;
}

// ── 測試區塊 ────────────────────────────────────────────────

console.log('\n=== DailyFlow 核心邏輯測試 ===\n');

// 1. dateKey
console.log('1. dateKey 函式');
assert('2026-06-11 轉換正確', dateKey(new Date('2026-06-11')) === '2026-6-11');
assert('月份不零填充（6 月，非 06）', dateKey(new Date('2026-06-01')) === '2026-6-1');
assert('跨年日期正確', dateKey(new Date('2027-01-01')) === '2027-1-1');
assert('12 月最後一天正確', dateKey(new Date('2026-12-31')) === '2026-12-31');

// 2. calcStreak
console.log('\n2. calcStreak 習慣連續天數');
{
  // 今天打卡，連續 3 天
  const checks = {
    '2026-6-11': 1,
    '2026-6-10': 1,
    '2026-6-9': 1,
    '2026-6-8': 0,
  };
  assert('今天打卡，連續 3 天', calcStreak(checks) === 3);
}
{
  // 今天未打卡，昨天連續 2 天
  const checks = {
    '2026-6-10': 1,
    '2026-6-9': 1,
  };
  assert('今天未打卡，從昨天回溯得 2 天', calcStreak(checks) === 2);
}
{
  // 完全沒打卡
  assert('沒有任何打卡記錄，streak = 0', calcStreak({}) === 0);
}
{
  // 今天打卡但中間斷了一天
  const checks = {
    '2026-6-11': 1,
    '2026-6-10': 0,
    '2026-6-9': 1,
  };
  assert('中間斷一天，streak 僅計今日 = 1', calcStreak(checks) === 1);
}
{
  // 補打歷史日期後連續
  const checks = {
    '2026-6-11': 1,
    '2026-6-10': 1,
    '2026-6-9': 1,
    '2026-6-8': 1,
    '2026-6-7': 1,
  };
  assert('連續 5 天', calcStreak(checks) === 5);
}

// 3. toggleHabitDay
console.log('\n3. toggleHabitDay 習慣打卡切換');
{
  const habit = { id: 1, name: '晨跑', checks: {}, streak: 0, total: 0 };
  toggleHabitDay(habit, '2026-6-11');
  assert('首次打卡：total 變為 1', habit.total === 1);
  assert('首次打卡：checks 記錄為 1', habit.checks['2026-6-11'] === 1);
  assert('首次打卡：streak 為 1', habit.streak === 1);

  toggleHabitDay(habit, '2026-6-11');
  assert('取消打卡：total 歸回 0', habit.total === 0);
  assert('取消打卡：checks 記錄為 0', habit.checks['2026-6-11'] === 0);
  assert('取消打卡：streak 歸回 0', habit.streak === 0);
}
{
  // total 不能低於 0：直接從 total=0 嘗試取消一筆未打卡日
  const habit = { id: 2, name: '喝水', checks: {}, streak: 0, total: 0 };
  // 模擬資料異常：total=0 但 checks 誤標 1（手動設）
  habit.checks['2026-6-10'] = 1;
  toggleHabitDay(habit, '2026-6-10'); // 取消打卡，total = max(0, -1) = 0
  assert('取消打卡時 total 最低為 0，不會變負數', habit.total === 0);
}

// 4. 任務 CRUD
console.log('\n4. 任務管理');
{
  const tasks = {};
  const k = '2026-6-11';

  // 新增
  tasks[k] = [
    { id: 1, text: '晨間冥想', tag: 'health', done: false },
    { id: 2, text: '寫週報', tag: 'work', done: false },
    { id: 3, text: '採買食材', tag: 'life', done: false },
  ];
  assert('新增 3 筆任務', tasks[k].length === 3);

  // 完成任務
  toggleTask(tasks, k, 2);
  assert('勾選任務 2 為完成', tasks[k].find(t => t.id === 2).done === true);

  // 再次勾選取消完成
  toggleTask(tasks, k, 2);
  assert('再次勾選任務 2 為未完成', tasks[k].find(t => t.id === 2).done === false);

  // pendingSummary
  assert('3 件未完成摘要正確', pendingSummary(tasks, k) === '今天還有 3 件待辦事項');
  toggleTask(tasks, k, 1);
  toggleTask(tasks, k, 2);
  toggleTask(tasks, k, 3);
  assert('全部完成摘要正確', pendingSummary(tasks, k) === '今天的任務都完成了 🎉');

  // 刪除
  deleteTask(tasks, k, 1);
  assert('刪除任務 1 後剩 2 筆', tasks[k].length === 2);
  deleteTask(tasks, k, 2);
  deleteTask(tasks, k, 3);
  assert('刪除全部後 key 自動移除', tasks[k] === undefined);
}

// 5. pendingSummary 邊界情況
console.log('\n5. pendingSummary 邊界情況');
{
  assert('無任何任務視為全完成', pendingSummary({}, '2026-6-11') === '今天的任務都完成了 🎉');
  assert('1 件未完成', pendingSummary({ '2026-6-11': [{ done: false }] }, '2026-6-11') === '今天還有 1 件待辦事項');
}

// ── 結果 ─────────────────────────────────────────────────────
console.log(`\n============================`);
console.log(`通過：${passed}  失敗：${failed}`);
if (failed === 0) {
  console.log('所有測試通過 ✓\n');
  process.exit(0);
} else {
  console.error(`有 ${failed} 個測試失敗\n`);
  process.exit(1);
}
