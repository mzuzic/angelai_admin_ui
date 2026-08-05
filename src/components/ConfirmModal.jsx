import { useEffect } from 'react'

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      style={overlayStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div style={modalStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{title}</span>
        </div>
        {message ? (
          <div style={bodyStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#5F5F5F', lineHeight: 1.55 }}>{message}</p>
          </div>
        ) : null}
        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button style={danger ? dangerBtnStyle : confirmBtnStyle} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'rgba(20, 20, 20, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const modalStyle = {
  background: '#FFFFFF',
  border: '1px solid #E5E4E1',
  borderRadius: 10,
  width: 'min(420px, 95vw)',
  boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
  overflow: 'hidden',
}

const headerStyle = {
  padding: '18px 20px 14px',
  background: '#FAF9F7',
  borderBottom: '1px solid #EDEBE7',
}

const bodyStyle = {
  padding: '16px 20px',
}

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  padding: '12px 20px 16px',
}

const baseBtnStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  padding: '7px 16px',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  border: '1px solid transparent',
}

const cancelBtnStyle = {
  ...baseBtnStyle,
  background: 'transparent',
  border: '1px solid #E5E4E1',
  color: '#1A1A1A',
}

const confirmBtnStyle = {
  ...baseBtnStyle,
  background: '#1A1A1A',
  color: '#FFFFFF',
}

const dangerBtnStyle = {
  ...baseBtnStyle,
  background: '#DC3545',
  color: '#FFFFFF',
}
