import React from 'react';
import { usePermissions } from '@/lib/usePermissions.jsx';
import { FEATURES, DEFAULT_FEATURE_ACCESS, ROLE_LABELS } from '@/lib/rbac';
import { Badge } from '@/components/ui/badge';
import { Crown, Eye, Pencil, Ban } from 'lucide-react';

const ROLES_ORDERED = ['super_admin', 'admin', 'manager', 'employee'];

const PERM_ICON = {
  edit: <Pencil className="w-3 h-3" />,
  view: <Eye className="w-3 h-3" />,
  none: <Ban className="w-3 h-3 opacity-30" />,
};
const PERM_COLORS = {
  edit: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  view: 'bg-blue-100 text-blue-700 border-blue-200',
  none: 'bg-slate-50 text-slate-300 border-transparent',
};

export default function RolesPermissionsMatrix() {
  const { featureSettings } = usePermissions();

  // Merge DB settings with defaults
  const settingsMap = {};
  FEATURES.forEach(f => {
    settingsMap[f.key] = featureSettings[f.key] || DEFAULT_FEATURE_ACCESS[f.key] || {};
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-400 rounded-tl-xl border-b w-48">Λειτουργία</th>
            <th className="text-center py-3 px-2 text-[10px] font-black uppercase text-slate-400 border-b w-20">Active</th>
            {ROLES_ORDERED.map(r => (
              <th key={r} className="text-center py-3 px-3 border-b">
                <div className="flex flex-col items-center gap-1">
                  {r === 'super_admin' && <Crown className="w-3.5 h-3.5 text-purple-500" />}
                  <span className="text-[10px] font-black uppercase text-slate-500">{ROLE_LABELS[r]}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature, idx) => {
            const s = settingsMap[feature.key];
            const isEnabled = s?.enabled !== false;
            return (
              <tr key={feature.key} className={`border-b last:border-0 hover:bg-slate-50/50 transition-colors ${!isEnabled ? 'opacity-50' : ''}`}>
                <td className="py-2.5 px-4">
                  <span className="font-semibold text-slate-700 text-xs">{feature.name}</span>
                </td>
                <td className="text-center py-2.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                </td>
                {ROLES_ORDERED.map(role => {
                  const level = role === 'super_admin' ? 'edit' : (s?.permissions_by_role?.[role] || 'none');
                  return (
                    <td key={role} className="text-center py-2.5 px-2">
                      <Badge className={`text-[10px] gap-1 px-2 h-5 border ${PERM_COLORS[level]}`}>
                        {PERM_ICON[level]}
                        {level === 'none' ? '—' : level === 'view' ? 'View' : 'Edit'}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}