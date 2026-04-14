import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEATURE_ACCESS,
  FEATURES,
  canAccess,
  getFeatureKeyFromPath,
  getPermissionLevel,
} from '@/lib/rbac';

describe('rbac hardening', () => {
  it('registers the protected operational routes', () => {
    expect(getFeatureKeyFromPath('/MyEmailSettings')).toBe('my_email_settings');
    expect(getFeatureKeyFromPath('/LiveUsers')).toBe('live_users');
    expect(getFeatureKeyFromPath('/AIInteractionsHistory')).toBe('ai_history');
    expect(FEATURES.some((feature) => feature.key === 'my_email_settings')).toBe(true);
    expect(FEATURES.some((feature) => feature.key === 'live_users')).toBe(true);
    expect(FEATURES.some((feature) => feature.key === 'ai_history')).toBe(true);
  });

  it('keeps live users and ai history restricted to super admins by default', () => {
    const adminUser = { role: 'admin', is_super_admin: false };
    const superAdminUser = { role: 'super_admin', is_super_admin: true };

    expect(DEFAULT_FEATURE_ACCESS.live_users.allowed_roles).toEqual(['super_admin']);
    expect(DEFAULT_FEATURE_ACCESS.ai_history.allowed_roles).toEqual(['super_admin']);

    expect(canAccess(adminUser, 'live_users', DEFAULT_FEATURE_ACCESS)).toBe(false);
    expect(canAccess(adminUser, 'ai_history', DEFAULT_FEATURE_ACCESS)).toBe(false);
    expect(getPermissionLevel(superAdminUser, 'live_users', DEFAULT_FEATURE_ACCESS)).toBe('edit');
    expect(getPermissionLevel(superAdminUser, 'ai_history', DEFAULT_FEATURE_ACCESS)).toBe('edit');
  });
});
