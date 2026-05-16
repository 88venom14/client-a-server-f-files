import { memo, useCallback, useEffect, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

function ModalImpl({ title, onClose, actions, children }: ModalProps) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const onBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className="modal-backdrop show" onClick={onBackdropClick}>
      <div className="modal-window">
        <div className="modal-titlebar">
          <span className="tb-left">
            <span className="tb-dot" />
            <span>{title}</span>
          </span>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export const Modal = memo(ModalImpl);
