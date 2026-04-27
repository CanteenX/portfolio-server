export const UI_FEATURE_FLAG_KEYS = [
  // Header
  "header.searchBar",
  "header.languageSwitcher",
  "header.fullscreenToggle",
  "header.lightDarkToggle",
  "header.notificationDropdown",
  "header.themeCustomizer",
  // Layout
  "layout.horizontalOption",
  "layout.twoColumnOption",
  "layout.sidebarThemes",
  "layout.sidebarSizes",
  // Sidebar sections
  "sidebar.modules",
  "sidebar.charts",
  "sidebar.forms",
  "sidebar.maps",
  "sidebar.pages",
  "sidebar.uiComponents",
  "sidebar.apps",
  // Pages
  "page.charts",
  "page.maps",
  "page.calendar",
  "page.kanban",
  "page.editor",
  "page.gallery",
  // Features
  "feature.i18n",
  "feature.rtlSupport",
  "feature.toastNotifications",
  // New features (Elevate.Admin adoption)
  "header.quickLinks",
  "header.universalSearch",
  "sidebar.dynamicMenus",
  "feature.permissionMatrix",
  "feature.csvExportModal",
  "feature.imageCropUploader",
  "feature.draggableTable",
  "feature.deleteConfirmModal",
] as const;

export type UIFeatureFlagKey = (typeof UI_FEATURE_FLAG_KEYS)[number];

export type UIFeatureFlags = Record<UIFeatureFlagKey, boolean>;

export const DEFAULT_UI_FEATURE_FLAGS: UIFeatureFlags = Object.fromEntries(
  UI_FEATURE_FLAG_KEYS.map((key) => [key, true])
) as UIFeatureFlags;
