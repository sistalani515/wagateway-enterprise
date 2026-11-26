export interface MessageEntity {
  id: string;
  sender: string;
  senderName?: string;
  text: string;
  isFromMe: boolean;
  isGroup: boolean;
  timestamp: number;
}
