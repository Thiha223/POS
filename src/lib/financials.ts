import { supabase } from './supabase';

export interface DateRange {
  start: Date;
  end: Date;
}

export type RangePreset = 'today' | 'week' | 'month' | 'custom';

export function getPresetRange(preset: RangePreset): DateRange {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start, end };
    }
    case 'week': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start, end };
    }
    case 'custom':
      return { start: now, end: now };
  }
}

export interface IncomeStatementData {
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: { category: string; amount: number }[];
  totalOperatingExpenses: number;
  netProfit: number;
}

export interface BalanceSheetData {
  inventoryValue: number;
  customerDebts: number;
  supplierDebts: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorkingCapital: number;
}

const fmtDate = (d: Date) => d.toISOString();

export async function fetchIncomeStatement(
  userId: string,
  range: DateRange
): Promise<IncomeStatementData> {
  const [salesRes, expenseRes] = await Promise.all([
    supabase
      .from('sales')
      .select('subtotal, discount, total')
      .eq('user_id', userId)
      .gte('created_at', fmtDate(range.start))
      .lte('created_at', fmtDate(range.end)),
    supabase
      .from('operating_expenses')
      .select('category, amount')
      .eq('user_id', userId)
      .gte('expense_date', range.start.toISOString().slice(0, 10))
      .lte('expense_date', range.end.toISOString().slice(0, 10)),
  ]);

  const sales = salesRes.data || [];
  const expenses = expenseRes.data || [];

  const grossRevenue = sales.reduce((s, r) => s + Number(r.subtotal || 0), 0);
  const totalDiscount = sales.reduce((s, r) => s + Number(r.discount || 0), 0);
  const netRevenue = grossRevenue - totalDiscount;

  // COGS: sum of (sale_items.qty * products.cost_price) for sales in range
  const saleIds = (salesRes.data || []).map((s: any) => s.id);
  let costOfGoodsSold = 0;

  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from('sale_items')
      .select('qty, product_id, unit_price')
      .in('sale_id', saleIds);

    if (items) {
      const productIds = [...new Set(items.map(i => i.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price')
        .in('id', productIds);

      const costMap = new Map<string, number>();
      (products || []).forEach(p => costMap.set(p.id, Number(p.cost_price || 0)));

      costOfGoodsSold = items.reduce((sum, item) => {
        const cost = costMap.get(item.product_id) || 0;
        return sum + item.qty * cost;
      }, 0);
    }
  }

  const grossProfit = netRevenue - costOfGoodsSold;

  // Group expenses by category
  const expenseMap = new Map<string, number>();
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    expenseMap.set(cat, (expenseMap.get(cat) || 0) + Number(e.amount || 0));
  });
  const operatingExpenses = Array.from(expenseMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalOperatingExpenses = operatingExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    grossRevenue,
    totalDiscount,
    netRevenue,
    costOfGoodsSold,
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    netProfit,
  };
}

export async function fetchBalanceSheet(userId: string): Promise<BalanceSheetData> {
  const [productsRes, debtsRes] = await Promise.all([
    supabase
      .from('products')
      .select('current_stock, cost_price')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('debts')
      .select('debt_type, amount, is_settled')
      .eq('user_id', userId)
      .eq('is_settled', false),
  ]);

  const products = productsRes.data || [];
  const debts = debtsRes.data || [];

  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.current_stock || 0) * Number(p.cost_price || 0),
    0
  );

  const customerDebts = debts
    .filter(d => d.debt_type === 'receivable')
    .reduce((s, d) => s + Number(d.amount || 0), 0);

  const supplierDebts = debts
    .filter(d => d.debt_type === 'payable')
    .reduce((s, d) => s + Number(d.amount || 0), 0);

  const totalAssets = inventoryValue + customerDebts;
  const totalLiabilities = supplierDebts;
  const netWorkingCapital = totalAssets - totalLiabilities;

  return {
    inventoryValue,
    customerDebts,
    supplierDebts,
    totalAssets,
    totalLiabilities,
    netWorkingCapital,
  };
}

export function formatMMK(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
}
