export type AuthMode = "login" | "register";

export interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onClose: (mode: AuthMode) => void;
  onModeChange: (mode: AuthMode) => void;
  /** Refreshes the session and navigates to the destination while the transition overlay is shown. */
  onAuthenticated: (redirectTo: string) => Promise<void>;
  showToast: (msg: string) => void;
}
