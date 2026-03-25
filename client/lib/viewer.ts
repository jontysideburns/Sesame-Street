export const VIEWER_COOKIE_NAME = "sesame_viewer";

export type ViewerSummary = {
  displayName: string;
  teamName: string;
  roleNames: string[];
  isDefault?: boolean;
};
