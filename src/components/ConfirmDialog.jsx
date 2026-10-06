import Modal from './Modal'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onClose,
  busy,
}) {
  const confirmClass = tone === 'primary' ? 'btn btn-primary' : 'btn btn-danger'
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button className={confirmClass} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{message}</p>
    </Modal>
  )
}
