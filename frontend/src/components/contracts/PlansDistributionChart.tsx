// React import not required with the new JSX transform
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#6366F1', '#EC4899', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#F97316'];

export default function PlansDistributionChart({ data }: { data: Record<string, number> }) {
  const pieData = Object.entries(data).map(([name, value]) => ({ name, value }));

  // custom label renderer: draws a connecting polyline and places label outside the pie
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, index, name } = props;
    const RAD = Math.PI / 180;
    const angle = -midAngle * RAD; // Recharts uses degrees, invert for cos/sin
    const sx = cx + outerRadius * Math.cos(angle); // start on outer edge
    const sy = cy + outerRadius * Math.sin(angle);
    const mx = cx + (outerRadius + 16) * Math.cos(angle); // mid point
    const my = cy + (outerRadius + 16) * Math.sin(angle);
    const lx = cx + (outerRadius + 36) * Math.cos(angle); // label pos
    const ly = cy + (outerRadius + 36) * Math.sin(angle);

    const textAnchor = lx > cx ? 'start' : 'end';
    const total = pieData.reduce((s, p) => s + Number(p.value), 0);
    const value = Number(pieData[index]?.value || 0);
    const pct = total > 0 ? (value / total) * 100 : 0;
    const colorHex = COLORS[index % COLORS.length];

    // Position name slightly above the circle, and percentage below
    const nameY = ly - 6;
    const subY = ly + 8;

    return (
      <g>
        <polyline points={`${sx},${sy} ${mx},${my} ${lx},${ly}`} stroke="#CBD5E1" strokeWidth={1} fill="none" />
        <circle cx={lx} cy={ly} r={4} fill={colorHex} />
        <text x={lx + (textAnchor === 'start' ? 8 : -8)} y={nameY} fill={colorHex} fontSize={14} fontWeight={600} textAnchor={textAnchor} dominantBaseline="central" className='text-2xl'>
          {name}
        </text>
        <text x={lx + (textAnchor === 'start' ? 8 : -8)} y={subY} fill="#000" fontSize={11} textAnchor={textAnchor} dominantBaseline="hanging" className='text-lg'>
          {pct.toFixed(2)}%
        </text>
      </g>
    );
  };

  return (
    <div className="h-[34rem] bg-gradient-to-b from-white/60 to-indigo-50 dark:from-gray-900 dark:to-gray-800 px-4 py-2 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">PLANS DISTRIBUTION</h3>
      {pieData.length === 0 ? (
        <div className="text-gray-500">No data</div>
      ) : (
        <div className="flex items-center justify-center">
          <div className="w-full h-[30rem]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={4}
                  cornerRadius={8}
                  label={renderLabel}
                  labelLine={false}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: string) => {
                  const total = pieData.reduce((s, p) => s + Number(p.value), 0);
                  const v = Number(value || 0);
                  const pct = total > 0 ? (v / total) * 100 : 0;
                  return [`${v} (${pct.toFixed(2)}%)`, name];
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
