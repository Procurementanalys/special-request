
export interface Store {
  code: string;
  name: string;
}

export interface Product {
  code: string;
  desc: string;
}

export interface RequestItem extends Product {
  id: string; // Unique ID for React key
  qty: number;
  reason: string;
}

export interface MasterData {
  stores: Store[];
  items: Product[];
}

export interface Status {
  type: 'success' | 'error' | 'info' | 'idle';
  message: string;
}
