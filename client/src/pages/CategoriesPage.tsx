import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '../api';

const PRESET_COLORS = [
  { label: 'Sage',     value: '#A8C4A0' },
  { label: 'Sky',      value: '#90B0C4' },
  { label: 'Sand',     value: '#C4B48A' },
  { label: 'Clay',     value: '#C4A090' },
  { label: 'Lavender', value: '#B0A0C4' },
  { label: 'Moss',     value: '#90A870' },
  { label: 'Wheat',    value: '#C4BC90' },
  { label: 'Stone',    value: '#A0A098' },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {PRESET_COLORS.map(c => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          title={c.label}
          className="w-6 h-6 rounded transition-transform"
          style={{
            background: c.value,
            border: value === c.value ? '2px solid var(--color-text-primary)' : '2px solid transparent',
            transform: value === c.value ? 'scale(1.2)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].value);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ cat: Category; force: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    setLoading(true);
    getCategories()
      .then(setCategories)
      .catch(() => setError('Failed to load categories.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newName.trim()) { setAddError('Name is required.'); return; }
    setAdding(true);
    try {
      await createCategory({ name: newName.trim(), color: newColor });
      setNewName('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setAddError(msg || 'Failed to create category.');
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (cat: Category) => {
    setEditModal(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditError('');
    if (!editName.trim()) { setEditError('Name is required.'); return; }
    setSaving(true);
    try {
      await updateCategory(editModal.id, { name: editName.trim(), color: editColor });
      setEditModal(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setEditError(msg || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (cat: Category) => {
    setDeleteError('');
    setDeleteModal({ cat, force: false });
  };

  const handleDeleteConfirm = async (force: boolean) => {
    if (!deleteModal) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteCategory(deleteModal.cat.id, force);
      setDeleteModal(null);
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string; problem_count?: number } } })?.response?.status;
      const data = (err as { response?: { data?: { error?: string; problem_count?: number } } })?.response?.data;
      if (status === 409 && data?.problem_count) {
        setDeleteModal({ cat: { ...deleteModal.cat, problem_count: data.problem_count }, force: true });
        setDeleteError('');
      } else {
        setDeleteError(data?.error || 'Failed to delete category.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-sm hover:underline" style={{ color: 'var(--color-text-muted)' }}>← Back</Link>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Manage Categories</h1>
      </div>

      {/* Add form */}
      <div className="card p-5 mb-8">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>Add New Category</h2>
        <form onSubmit={handleAdd}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. SystemDesign"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <button type="submit" disabled={adding} className="btn-primary disabled:opacity-50 whitespace-nowrap px-4 py-2">
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {addError && <p className="mt-2 text-xs" style={{ color: '#7A200E' }}>{addError}</p>}
        </form>
      </div>

      {/* Category list */}
      {error ? (
        <div className="rounded-lg p-4 text-sm" style={{ background: '#F8E0DC', color: '#7A200E', border: '1px solid #E8B0A0' }}>{error}</div>
      ) : loading ? (
        <div className="py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Category</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Problems</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr
                  key={cat.id}
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    background: idx % 2 === 0 ? 'var(--color-bg)' : 'var(--color-surface)',
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: cat.color, color: 'var(--color-text-primary)' }}>
                      {cat.name}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{cat.problem_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        className="text-xs hover:underline"
                        style={{ color: '#7A200E' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(44,44,42,0.4)' }}
          onClick={() => !saving && setEditModal(null)}
        >
          <div
            className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Edit Category
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="input-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
                <ColorPicker value={editColor} onChange={setEditColor} />
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: editColor, color: 'var(--color-text-primary)' }}>
                    {editName || 'Preview'}
                  </span>
                </div>
              </div>
            </div>
            {editError && <p className="text-xs mt-3" style={{ color: '#7A200E' }}>{editError}</p>}
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => !saving && setEditModal(null)}
                disabled={saving}
                className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(44,44,42,0.4)' }}
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Delete "{deleteModal.cat.name}"?
            </h3>

            {deleteModal.force ? (
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                This category has <strong>{deleteModal.cat.problem_count}</strong> problem(s).
                After deletion, those problems will be moved to <em>Uncategorized</em>.
                <br /><br />Confirm delete?
              </p>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                This action cannot be undone.
              </p>
            )}

            {deleteError && <p className="text-xs mb-3" style={{ color: '#7A200E' }}>{deleteError}</p>}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => !deleting && setDeleteModal(null)}
                disabled={deleting}
                className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deleteModal.force)}
                disabled={deleting}
                className="text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: '#E8B0A0', color: '#7A200E', border: '1px solid #C4806C' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
