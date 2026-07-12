/*
# Add Financial Statements support tables

1. New Tables
- `operating_expenses` — tracks recurring/one-time operating expenses (rent, utilities, salaries, etc.)
  - `id` (uuid, PK)
  - `user_id` (uuid, owner, defaults to auth.uid())
  - `category` (text, e.g. 'Rent', 'Utilities', 'Salaries', 'Marketing', 'Other')
  - `description` (text, optional detail)
  - `amount` (numeric, expense amount in MMK)
  - `expense_date` (date, when the expense occurred)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
- `debts` — tracks outstanding receivables (customer owes shop) and payables (shop owes supplier)
  - `id` (uuid, PK)
  - `user_id` (uuid, owner, defaults to auth.uid())
  - `debt_type` (text, 'receivable' or 'payable')
  - `party_name` (text, customer or supplier name)
  - `amount` (numeric, outstanding amount in MMK)
  - `due_date` (date, optional)
  - `is_settled` (boolean, default false)
  - `note` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on both tables.
- Owner-scoped CRUD: each authenticated user can only access their own rows.
- `user_id` defaults to `auth.uid()` so inserts that omit it still succeed.

3. Notes
- `operating_expenses.expense_date` is a DATE (not timestamptz) so date-range filtering by day is exact.
- `debts.is_settled` lets the owner mark a debt as paid without deleting the record.
- CHECK constraint on `debts.debt_type` ensures only 'receivable' or 'payable'.
*/

CREATE TABLE IF NOT EXISTS operating_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'Other',
  description text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE operating_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expenses" ON operating_expenses;
CREATE POLICY "select_own_expenses" ON operating_expenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expenses" ON operating_expenses;
CREATE POLICY "insert_own_expenses" ON operating_expenses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expenses" ON operating_expenses;
CREATE POLICY "update_own_expenses" ON operating_expenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expenses" ON operating_expenses;
CREATE POLICY "delete_own_expenses" ON operating_expenses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_user_date ON operating_expenses(user_id, expense_date);

CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_type text NOT NULL CHECK (debt_type IN ('receivable', 'payable')),
  party_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  is_settled boolean NOT NULL DEFAULT false,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_debts" ON debts;
CREATE POLICY "select_own_debts" ON debts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_debts" ON debts;
CREATE POLICY "insert_own_debts" ON debts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_debts" ON debts;
CREATE POLICY "update_own_debts" ON debts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_debts" ON debts;
CREATE POLICY "delete_own_debts" ON debts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_debts_user_type ON debts(user_id, debt_type);
