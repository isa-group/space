// React import not required with the new JSX transform
import { useEffect, useState } from 'react';

interface Props {
  compute: () => Promise<number>;
}

export default function ExpectedRevenueCard({ compute }: Props) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    compute()
      .then(v => mounted && setValue(v))
      .catch(() => mounted && setValue(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [compute]);

  return (
    <div className="p-4 bg-gradient-to-b from-white/50 to-rose-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
      <div className="text-sm text-gray-500">Expected monthly revenue</div>
      <div className="text-3xl font-extrabold text-rose-600 mt-2">
        {loading ? 'Calculating...' : value !== null ? `$ ${value.toFixed(2)}` : '—'}
      </div>
      <div className="text-xs text-gray-500 mt-3">Only active contracts with renewal or valid endDate considered</div>
    </div>
  );
}
