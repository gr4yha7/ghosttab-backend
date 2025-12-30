export type NotificationType = 
  'FRIEND_REQUEST' |
  'FRIEND_ACCEPTED' |
  'TAB_CREATED' |
  'TAB_UPDATED' |
  'PAYMENT_RECEIVED' |
  'PAYMENT_REMINDER' |
  'TAB_SETTLED' |
  'MESSAGE_RECEIVED'

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "BLOCKED"
export type TabStatus = "OPEN" | "SETTLED" | "CANCELLED"
export type TransactionType = "PAYMENT" | "SETTLEMENT" | "VAULT_DEPOSIT" | "VAULT_WITHDRAWAL"