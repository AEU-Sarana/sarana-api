export interface PasswordResetRequestedEvent {
  userId: number;
  username: string;
  email: string;
  resetToken: string;
}


