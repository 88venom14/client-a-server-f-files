import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LIMITS, validateName } from '@/lib/validation';

interface Props {
  currentName: string;
  onClose: () => void;
  onConfirm: (next: string) => void;
}

function RenameModalImpl({ currentName, onClose, onConfirm }: Props) {
  const [val, setVal] = useState(currentName);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const error = useMemo(() => validateName(val), [val]);
  const canSubmit = !error;

  const submit = useCallback(() => {
    if (canSubmit) onConfirm(val.trim());
  }, [canSubmit, val, onConfirm]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setVal(e.target.value),
    [],
  );
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  }, [submit]);

  return (
    <Modal
      title="ПЕРЕИМЕНОВАТЬ"
      onClose={onClose}
      actions={
        <>
          <button className="btn-pixel ghost" type="button" onClick={onClose}>ОТМЕНА</button>
          <button className="btn-pixel" type="button" disabled={!canSubmit} onClick={submit}>
            СОХРАНИТЬ
          </button>
        </>
      }
    >
      <span className="form-label">ТЕКУЩЕЕ</span>
      <div className="rename-current">{currentName}</div>
      <span className="form-label">НОВОЕ ИМЯ</span>
      <input
        ref={ref}
        className="rename-input"
        type="text"
        value={val}
        maxLength={LIMITS.nameMax}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {val && error && <div className="form-error">{error}</div>}
    </Modal>
  );
}

export const RenameModal = memo(RenameModalImpl);
