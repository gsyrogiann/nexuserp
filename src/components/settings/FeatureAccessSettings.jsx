import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/lib/usePermissions.jsx';
import { FEATURES, DEFAULT_FEATURE_ACCESS, ROLE_LABELS } from '@/lib/rbac';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';

const ROLES_ORDERED = ['admin', 'manager', 'employee'];

const PERM_COLORS = {
  edit: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  view: 'bg-blue-100 text-blue-700 border-blue-200',
  none: 'bg-slate-100 text-slate-400 border-slate-200',
};

export default function FeatureAccessSettings() {
  const { isSuperAdmin: superAdmin, refreshSettings, user } = usePermissions();
  const qc = useQueryClient();

  const { data: dbSettings = [] } = useQuery({
    queryKey: ['permission-settings'],
    queryFn: () => base44.entities.PermissionSettings.list(),
  });

  // Build merged map: featureKey -> settings
  const settingsMap = {};
  FEATURES.forEach(f => {
    settingsMap[f.key] = { ...DEFAULT_FEATURE_ACCESS[f.key] };
  });
  dbSettings.forEach(s => {
    if (settingsMap[s.feature_key]) {
      settingsMap[s.feature_key] = {
        enabled: s.enabled ?? true,
        allowed_roles: s.allowed_roles || DEFAULT_FEATURE_ACCESS[s.feature_key]?.allowed_roles || [],
        permissions_by_role: s.permissions_by_role || DEFAULT_FEATURE_ACCESS[s.feature_key]?.permissions_by_role || {},
        _db_id: s.id,
      };
    }
  });

  const [saving, setSaving] = useState(null);

  const saveFeature = async (featureKey, patch) => {
    setSaving(featureKey);
    const feature = FEATURES.find(f => f.key === featureKey);
    const current = settingsMap[featureKey];
    const updated = { ...current, ...patch };
    const existing = dbSettings.find(s => s.feature_key === featureKey);

    const payload = {
      feature_key: featureKey,
      feature_name: feature.name,
      enabled: updated.enabled,
      allowed_roles: updated.allowed_roles,
      permissions_by_role: updated.permissions_by_role,
      updated_by: user?.email,
    };

    try {
      if (existing?.id) {
        await base44.entities.PermissionSettings.update(existing.id, payload);
      } else {
        await base44.entities.PermissionSettings.create(payload);
      }
      qc.invalidateQueries({ queryKey: ['permission-settings'] });
      await refreshSettings();
      toast.success(`Αποθηκεύτηκε: ${feature.name}`);
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = (featureKey, enabled) => {
    saveFeature(featureKey, { enabled });
  };

  const changeRolePermission = (featureKey, role, level) => {
    const current = settingsMap[featureKey];
    const newByRole = { ...current.permissions_by_role, [role]: level };
    // Update allowed_roles based on permission level
    let allowedRoles = [...(current.allowed_roles || [])];
    if (level === 'none') {
      allowedRoles = allowedRoles.filter(r => r !== role);
    } else if (!allowedRoles.includes(role)) {
      allowedRoles.push(role);
    }
    saveFeature(featureKey, { permissions_by_role: newByRole, allowed_roles: allowedRoles });
  };

  if (!superAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Lock className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm font-medium">Μόνο ο Super Admin μπορεί να αλλάξει τα permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_60px_repeat(3,_100px)] gap-3 items-center px-4 py-2 bg-slate-50 rounded-xl border">
        <span className="text-[10px] font-black uppercase text-slate-400">Λειτουργία</span>
        <span className="text-[10px] font-black uppercase text-slate-400 text-center">ON/OFF</span>
        {ROLES_ORDERED.map(r => (
          <span key={r} className="text-[10px] font-black uppercase text-slate-400 text-center">{ROLE_LABELS[r]}</span>
        ))}
      </div>

      {FEATURES.map(feature => {
        const s = settingsMap[feature.key] || {};
        const isEnabled = s.enabled !== false;

        return (
          <div key={feature.key} className={`grid grid-cols-[1fr_60px_repeat(3,_100px)] gap-3 items-center px-4 py-3 rounded-xl border bg-card transition-opacity ${!isEnabled ? 'opacity-60' : ''}`}>
            {/* Feature name */}
            <div className="flex items-center gap-2">
              {isEnabled ? <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              <span className="text-sm font-semibold text-slate-700">{feature.name}</span>
              {saving === feature.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
            </div>

            {/* Global toggle */}
            <div className="flex justify-center">
              <Switch
                checked={isEnabled}
                onCheckedChange={v => toggleEnabled(feature.key, v)}
                className="scale-90"
              />
            </div>

            {/* Per-role permission */}
            {ROLES_ORDERED.map(role => {
              const level = s.permissions_by_role?.[role] || 'none';
              return (
                <div key={role} className="flex justify-center">
                  <Select value={level} onValueChange={v => changeRolePermission(feature.key, role, v)} disabled={!isEnabled}>
                    <SelectTrigger className="h-7 text-[11px] rounded-lg px-2 border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                      <Badge className={`text-[10px] px-2 h-5 border ${PERM_COLORS[level]}`}>{level === 'none' ? '—' : level === 'view' ? 'View' : 'Edit'}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edit"><span className="text-xs font-bold text-emerald-700">Edit</span></SelectItem>
                      <SelectItem value="view"><span className="text-xs font-bold text-blue-700">View</span></SelectItem>
                      <SelectItem value="none"><span className="text-xs font-bold text-slate-400">— Κανένα</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}