import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function AddMemberModal() {
  const { closeModal, addMember, MEMBER_COLORS } = useApp()
  const [name, setName] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    addMember({ name: name.trim() })
    closeModal()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={closeModal}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Add family member</div>
          <button className="btn-icon" onClick={closeModal} style={{ fontSize: 18, padding: '4px 8px' }}>×</button>
        </div>
        <div className="form-group">
          <label>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add member</button>
        </div>
      </div>
    </div>
  )
}
