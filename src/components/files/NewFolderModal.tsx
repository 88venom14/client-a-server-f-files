import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LIMITS, validateName } from '@/lib/validation';

interface Props {
  onClose: () => void;
  onConfirm: (name: string) => void;
}

function NewFolderModalImpl({ onClose, onConfirm }: Props) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const error = useMemo(() => (val ? validateName(val) : null), [val]);
  const trimmed = val.trim();
  const canSubmit = !!trimmed && !error;

  const submit = useCallback(() => {
    if (canSubmit) onConfirm(trimmed);
  }, [canSubmit, trimmed, onConfirm]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setVal(e.target.value),
    [],
  );
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  }, [submit]);

  return (
    <Modal
      title="НОВАЯ ПАПКА"
      onClose={onClose}
      actions={
        <>
          <button className="btn-pixel ghost" type="button" onClick={onClose}>ОТМЕНА</button>
          <button className="btn-pixel" type="button" disabled={!canSubmit} onClick={submit}>
            СОЗДАТЬ
          </button>
        </>
      }
    >
      <span className="form-label">ИМЯ ПАПКИ</span>
      <input
        ref={ref}
        className="rename-input"
        value={val}
        maxLength={LIMITS.nameMax}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="НОВАЯ ПАПКА"
      />
      {error && <div className="form-error">{error}</div>}
    </Modal>
  );
}

export const NewFolderModal = memo(NewFolderModalImpl);
