import { useEffect } from 'react'

// Modal de confirmação customizado - substitui o confirm() nativo (que parece 1995).
// Suporta variante 'danger' (vermelho) para ações destrutivas e 'default' (azul).

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'default', onConfirm, onCancel,
}: ConfirmModalProps) {
  // Escape fecha o modal (UX padrão)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4"
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        <div className="flex gap-2 justify-end p-4 bg-gray-50 rounded-b-lg">
          <button onClick={onCancel}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-100">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`${confirmClass} text-white px-4 py-2 rounded text-sm font-medium`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
