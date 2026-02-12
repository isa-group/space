import { useState, type JSX } from 'react';
import CustomAlert from '../components/CustomAlert';
import type { CustomAlertType } from '../components/CustomAlert';

export function useCustomAlert(): {
    showAlert: (msg: string, type?: CustomAlertType) => Promise<void>,
    alertElement: JSX.Element | null
} {
  const [alert, setAlert] = useState<
    { message: string; type: CustomAlertType; resolve: () => void } | null
  >(null);

  const showAlert = (message: string, type: CustomAlertType = 'info') => {
    return new Promise<void>((resolve) => {
      setAlert({ message, type, resolve });
    });
  };

  const handleClose = () => {
    if (alert) {
      alert.resolve();
      setAlert(null);
    }
  };

  const alertElement =
    alert && (
      <CustomAlert message={alert.message} onClose={handleClose} type={alert.type} />
    );

  return {showAlert, alertElement};
}
