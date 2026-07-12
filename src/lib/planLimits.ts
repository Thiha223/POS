import { SubscriptionPlan } from '../types';

export interface PlanLimits {
  maxProducts: number;
  barcodeScanning: boolean;
  customBranding: boolean;
  salesReports: boolean;
  csvExport: boolean;
}

const LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxProducts: 10,
    barcodeScanning: false,
    customBranding: false,
    salesReports: false,
    csvExport: false,
  },
  basic: {
    maxProducts: 500,
    barcodeScanning: false,
    customBranding: true,
    salesReports: true,
    csvExport: true,
  },
  premium: {
    maxProducts: Infinity,
    barcodeScanning: true,
    customBranding: true,
    salesReports: true,
    csvExport: true,
  },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return LIMITS[plan] ?? LIMITS.free;
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Free',
  basic: 'Basic',
  premium: 'Premium',
};

export const FEATURE_UPGRADE_TARGET: Record<keyof PlanLimits, SubscriptionPlan> = {
  maxProducts: 'premium',
  barcodeScanning: 'premium',
  customBranding: 'basic',
  salesReports: 'basic',
  csvExport: 'basic',
};
