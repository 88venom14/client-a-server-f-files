import {
  Folder, Trash2, Info, FileText, Image as ImageIcon, File,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type LucideComp = React.FC<LucideProps>;

const ICON_MAP: Record<string, LucideComp> = {
  folder: Folder,
  trash: Trash2,
  info: Info,
  'file-txt': FileText,
  'file-img': ImageIcon,
  'file-bin': File,
  'big-folder': Folder,
  'big-landscape': ImageIcon,
  'big-doc': FileText,
  'big-bin': Trash2,
};

export function Icon({ name, className = 'ico' }: { name: string; className?: string }) {
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return (
    <span className={className}>
      <Comp
        style={{ width: '100%', height: '100%', display: 'block' }}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={1.5}
      />
    </span>
  );
}
