const BASE = "/api";

export interface PartURL {
  id: number;
  url: string;
}

export interface Part {
  id: number;
  title: string;
  short_description: string | null;
  type: string;
  custom_image_path: string | null;
  created_at: string;
  updated_at: string;
  urls: PartURL[];
}

export interface PartCreate {
  title: string;
  short_description: string | null;
  type: string;
  custom_image_path?: string | null;
  urls: string[];
}

export interface PartUpdate {
  title?: string;
  short_description?: string | null;
  type?: string;
  custom_image_path?: string | null;
  urls?: string[];
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  parts: {
    list: () => req<Part[]>("/parts"),
    get: (id: number) => req<Part>(`/parts/${id}`),
    create: (data: PartCreate) =>
      req<Part>("/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (id: number, data: PartUpdate) =>
      req<Part>(`/parts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: number) => req<void>(`/parts/${id}`, { method: "DELETE" }),
  },
  color: (title: string) =>
    req<{ color: string | null }>(`/color?title=${encodeURIComponent(title)}`),
  types: () => req<string[]>("/types"),
  uploadImage: async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/uploads`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    return data.path as string;
  },
  qrUrl: (data: string) => `${BASE}/qr?data=${encodeURIComponent(data)}`,
  scan: {
    resolve: (payload: string) =>
      req<{ id: number; title: string; short_description: string | null; type: string; urls: string[] }>(
        "/scan/resolve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        },
      ),
  },
  shopping: {
    list: () => req<ShoppingItem[]>("/shopping"),
    add: (part_id: number, qty = 1) =>
      req<ShoppingItem>("/shopping/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part_id, qty }),
      }),
    setQty: (item_id: number, qty: number) =>
      req<ShoppingItem>(`/shopping/${item_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      }),
    remove: (item_id: number) =>
      req<void>(`/shopping/${item_id}`, { method: "DELETE" }),
    clear: () => req<void>("/shopping/clear", { method: "POST" }),
    exportUrl: "/api/shopping/export",
  },
};

export interface ShoppingItem {
  id: number;
  part_id: number;
  qty: number;
  created_at: string;
  updated_at: string;
  part: {
    id: number;
    title: string;
    short_description: string | null;
    type: string;
    urls: string[];
  } | null;
}
