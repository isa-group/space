import { useState, type JSX } from 'react';
import CustomConfirm from '../components/CustomConfirm';

export type CustomConfirmType = 'info' | 'warning' | 'danger';

export function useCustomConfirm(): {
  showConfirm: (msg: string, type?: CustomConfirmType) => Promise<boolean>,
  confirmElement: JSX.Element | null
} {
  const [confirm, setConfirm] = useState<
    { message: string; type: CustomConfirmType; resolve: (result: boolean) => void } | null
  >(null);

  const showConfirm = (message: string, type: CustomConfirmType = 'info') => {
    return new Promise<boolean>((resolve) => {
      setConfirm({ message, type, resolve });
    });
  };

  const handleConfirm = () => {
    if (confirm) {
      confirm.resolve(true);
      setConfirm(null);
    }
  };

  const handleCancel = () => {
    if (confirm) {
      confirm.resolve(false);
      setConfirm(null);
    }
  };

  const confirmElement =
    confirm && (
      <CustomConfirm
        message={confirm.message}
        type={confirm.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

  return {showConfirm, confirmElement};
}
