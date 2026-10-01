'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';

type SavedView = {
  id: string;
  name: string;
  query: string;
};

function storageKey(scope: string) {
  return `feya-owner-saved-views:${scope}:v1`;
}

export function OwnerSavedViewsClient({
  scope,
  label = 'Сохранённые виды',
}: {
  scope: string;
  label?: string;
}) {
  const pathname = usePathname() || '/admin/company';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [views, setViews] = useState<SavedView[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const currentQuery = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('page');
    return next.toString();
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(scope));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && Array.isArray(parsed.views)) {
        setViews(parsed.views.filter((item: SavedView) => item?.id && item?.name));
      }
    } catch {
      // Saved views are local preferences only.
    }
  }, [scope]);

  function persist(next: SavedView[]) {
    setViews(next);
    try {
      window.localStorage.setItem(storageKey(scope), JSON.stringify({ version: 1, views: next }));
    } catch {
      // The queue still works without local preference storage.
    }
  }

  function apply(id: string) {
    setSelectedId(id);
    const view = views.find((item) => item.id === id);
    if (!view) return;
    router.push(view.query ? `${pathname}?${view.query}` : pathname);
  }

  function save() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const view: SavedView = {
      id: `view-${Date.now()}`,
      name: cleanName,
      query: currentQuery,
    };
    persist([...views, view]);
    setSelectedId(view.id);
    setName('');
    setShowCreate(false);
  }

  function remove() {
    if (!selectedId) return;
    persist(views.filter((view) => view.id !== selectedId));
    setSelectedId('');
  }

  return (
    <div className="owner-saved-views">
      <div className="owner-saved-view-select">
        <Bookmark size={13} aria-hidden="true" />
        <select
          value={selectedId}
          onChange={(event) => apply(event.target.value)}
          aria-label={label}
        >
          <option value="">{label}</option>
          {views.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
        </select>
      </div>

      <button type="button" className="owner-button" onClick={() => setShowCreate((value) => !value)}>
        <BookmarkPlus size={13} aria-hidden="true" />
        Сохранить текущий вид
      </button>

      {selectedId ? (
        <button type="button" className="owner-button" onClick={remove} title="Удалить выбранный вид">
          <Trash2 size={13} aria-hidden="true" />
          Удалить
        </button>
      ) : null}

      {showCreate ? (
        <div className="owner-saved-view-create">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
            className="field"
            placeholder="Название вида, например: Заблокировано"
            autoFocus
          />
          <button type="button" className="owner-button primary" onClick={save} disabled={!name.trim()}>
            Сохранить
          </button>
        </div>
      ) : null}
    </div>
  );
}
