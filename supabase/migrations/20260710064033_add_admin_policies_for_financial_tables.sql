/*
# Add admin full-access RLS policies for operating_expenses and debts

## Summary
1. Add admin policies (SELECT, INSERT, UPDATE, DELETE) for `operating_expenses`
2. Add admin policies (SELECT, INSERT, UPDATE, DELETE) for `debts`
3. These allow admins (via `public.is_admin()`) to read and modify any user's
   financial records, bypassing the standard owner-only restriction.
4. Uses the same `public.is_admin() OR auth.uid() = user_id` pattern as all
   other admin policies in the project.

## Tables Modified
- `operating_expenses` — admin can now CRUD any row, not just their own
- `debts` — admin can now CRUD any row, not just their own

## Security
- `public.is_admin()` is a SECURITY DEFINER function that checks the caller's
  profile for `role = 'admin' OR is_admin = true`.
- Non-admin users are still restricted to their own rows via `auth.uid() = user_id`.
*/

-- OPERATING EXPENSES - Admin policies
DROP POLICY IF EXISTS "select_all_expenses_admin" ON public.operating_expenses;
CREATE POLICY "select_all_expenses_admin"
  ON public.operating_expenses FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_expenses_admin" ON public.operating_expenses;
CREATE POLICY "insert_all_expenses_admin"
  ON public.operating_expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_expenses_admin" ON public.operating_expenses;
CREATE POLICY "update_all_expenses_admin"
  ON public.operating_expenses FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_expenses_admin" ON public.operating_expenses;
CREATE POLICY "delete_all_expenses_admin"
  ON public.operating_expenses FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- DEBTS - Admin policies
DROP POLICY IF EXISTS "select_all_debts_admin" ON public.debts;
CREATE POLICY "select_all_debts_admin"
  ON public.debts FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_debts_admin" ON public.debts;
CREATE POLICY "insert_all_debts_admin"
  ON public.debts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_debts_admin" ON public.debts;
CREATE POLICY "update_all_debts_admin"
  ON public.debts FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_debts_admin" ON public.debts;
CREATE POLICY "delete_all_debts_admin"
  ON public.debts FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);
