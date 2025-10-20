import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  addonsByPlan: Record<string, Record<string, number>>;
  plansOrder?: string[];
}

function formatAddonName(key: string) {
  if (!key) return '';
  // replace dashes/underscores with space
  let s = key.replace(/[-_]/g, ' ');
  // insert space before capital letters (camelCase -> words)
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  // normalize multiple spaces
  s = s.replace(/\s+/g, ' ').trim();
  // Title case
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function AddonsByPlanCharts({ addonsByPlan, plansOrder = [] }: Props) {
  // Build a map of addon -> [{ plan, count }]
  const addonMap: Record<string, { plan: string; count: number }[]> = {};

  for (const plan of Object.keys(addonsByPlan || {})) {
    for (const [addon, count] of Object.entries(addonsByPlan[plan] || {})) {
      addonMap[addon] = addonMap[addon] || [];
      addonMap[addon].push({ plan, count });
    }
  }

  const addons = Object.keys(addonMap);

  if (addons.length === 0) {
    return <div className="p-4 bg-white/50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm text-gray-500">No add-ons data</div>;
  }

  return (
    <div className="flex flex-wrap gap-4 justify-evenly">
      {addons.map(addon => {
        // ensure all plans are present in the data (even with 0)
        const plans = plansOrder && plansOrder.length > 0 ? plansOrder : Array.from(new Set(Object.values(addonMap[addon] || []).map(i => i.plan)));
        const planCountsByPlan: Record<string, number> = {};
        for (const p of (addonMap[addon] || [])) planCountsByPlan[p.plan] = p.count;

        const data = plans.map(planName => ({ plan: planName, count: Number(planCountsByPlan[planName] || 0) }));

        return (
          <div key={addon} className="p-4 flex-grow w-[512px] bg-white/50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-700 dark:text-gray-200">{formatAddonName(addon)}</div>
              <div className="text-sm text-gray-500">Total: {data.reduce((s, i) => s + i.count, 0)}</div>
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="plan" width={140} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#06B6D4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
