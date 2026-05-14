const STORAGE_KEY = "user-photos";

export interface StoredPhoto {
  id: string;
  src: string;
  name: string;
}

export const BRAND_PHOTOS: StoredPhoto[] = [
  { id: "bp-1", src: "/brand/interior-arch.jpg", name: "Interior Archway" },
  { id: "bp-2", src: "/brand/interior-staircase.jpg", name: "Interior Staircase" },
  { id: "bp-3", src: "/brand/streetscape.jpg", name: "Streetscape" },
  { id: "bp-4", src: "/brand/ad-fireplace.jpg", name: "Fireplace" },
  { id: "bp-5", src: "/brand/ad-portrait.jpg", name: "Ad Portrait" },
  { id: "bp-6", src: "/brand/angie-portrait.jpg", name: "Angie Portrait" },
  { id: "bp-7", src: "/brand/IMG_8730.jpg", name: "Property Photo 1" },
  { id: "bp-8", src: "/brand/IMG_8731.jpg", name: "Property Photo 2" },
  { id: "bp-9", src: "/brand/IMG_8732.jpg", name: "Property Photo 3" },
  { id: "bp-10", src: "/brand/IMG_8733.jpg", name: "Property Photo 4" },
  { id: "bp-11", src: "/brand/IMG_8734.jpg", name: "Property Photo 5" },
  { id: "bp-12", src: "/brand/cover.jpg", name: "Cover Photo" },
];

export function getUserPhotos(): StoredPhoto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserPhoto(photo: StoredPhoto) {
  const photos = getUserPhotos();
  photos.unshift(photo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos.slice(0, 50)));
}

export function removeUserPhoto(id: string) {
  const photos = getUserPhotos().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}
