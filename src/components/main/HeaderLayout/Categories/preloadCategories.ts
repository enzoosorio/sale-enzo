import { useCategoriesStore } from "@/store/categorySection";

let parentsRequest: Promise<void> | null = null;

/** Fetch the parent categories once; later calls reuse the store. */
export function preloadParentCategories() {
  const store = useCategoriesStore.getState();
  if (store.parentCategories.length > 0) return Promise.resolve();
  if (parentsRequest) return parentsRequest;

  store.setIsLoadingCategories(true);
  parentsRequest = import("@/utils/filters/categories")
    .then(({ getParentCategories }) => getParentCategories())
    .then((categories) => store.setParentCategories(categories))
    .catch((error) => {
      console.error("Error fetching categories:", error);
      parentsRequest = null;
    })
    .finally(() => store.setIsLoadingCategories(false));

  return parentsRequest;
}

export const loadCategoriesPanel = () => import("./CategoriesPanel");

/** Warm up the panel code and its first data on hover/focus/touch of any trigger. */
export function preloadCategoriesPanel() {
  void loadCategoriesPanel();
  void preloadParentCategories();
}
