export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  totp_secret?: string; // TOTP secret in base32 format
  tags?: string[]; // 标签列表
  sort_order?: number; // 排序顺序
  created_at: number;
  updated_at: number;
}

export interface LoginProps {
  onLogin: () => void;
}

export interface PasswordListProps {
  entries: PasswordEntry[];
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onUpdateOrder: (entries: PasswordEntry[]) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export interface PasswordFormProps {
  entry?: PasswordEntry;
  onSave: (entry: PasswordEntry) => void;
  onCancel: () => void;
}

