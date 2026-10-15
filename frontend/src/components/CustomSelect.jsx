import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * App-native dropdown — no browser/Chrome default select.
 * props:
 *  options: [{ value, label, sublabel? }]
 *  value: string | number
 *  onChange: (value) => void
 *  placeholder?: string
 *  className?: string
 *  disabled?: boolean
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value))

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2 px-3.5 py-2.5
          bg-white border border-gray-200 rounded-xl text-sm text-left
          shadow-sm transition-all duration-150
          hover:border-primary-300 hover:shadow
          focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}
        `}
      >
        <span className={selected ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selected ? (
            <span className="flex flex-col">
              <span>{selected.label}</span>
              {selected.sublabel && (
                <span className="text-[11px] text-gray-400 font-normal">{selected.sublabel}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="
            absolute z-50 mt-1.5 w-full min-w-[200px]
            bg-white border border-gray-150 rounded-xl shadow-xl shadow-gray-200/80
            py-1.5 max-h-64 overflow-auto
            animate-in fade-in slide-in-from-top-1
          "
          style={{
            animation: 'selectIn 0.15s ease-out',
          }}
        >
          <style>{`
            @keyframes selectIn {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {options.length === 0 && (
            <div className="px-3.5 py-2.5 text-sm text-gray-400">No options</div>
          )}
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`
                  w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left
                  transition-colors
                  ${isSelected
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-[11px] text-gray-400 truncate">{opt.sublabel}</span>
                  )}
                </span>
                {isSelected && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
