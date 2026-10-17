import type { LibrarySort } from "./listPreferences";

export const LIBRARY_SORT_OPTIONS: readonly { value: LibrarySort; label: string }[] = [
  { value: "custom", label: "My order" },
  { value: "updated_desc", label: "Updated: newest first" },
  { value: "updated_asc", label: "Updated: oldest first" },
  { value: "course", label: "Course order" },
  { value: "title_asc", label: "Alphabetical: A to Z" },
  { value: "title_desc", label: "Alphabetical: Z to A" },
];
