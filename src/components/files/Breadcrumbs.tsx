import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { FolderRow } from '@/types';

function BreadcrumbsImpl({ trail }: { trail: FolderRow[] }) {
  return (
    <nav className="breadcrumbs">
      <Link to="/">ГЛАВНАЯ</Link>
      {trail.map((f) => (
        <span key={f.id} className="crumb">
          <span className="sep">/</span>
          <Link to={`/folders/${f.id}`}>{f.name.toUpperCase()}</Link>
        </span>
      ))}
    </nav>
  );
}

export const Breadcrumbs = memo(BreadcrumbsImpl);
