import { Connection } from "jsforce";

export type SalesforceConnection = Connection;

export type SalesforceCredentials =
  | {
      type: "username_password";
      username: string;
      password: string;
      securityToken: string;
    }
  | {
      type: "jwt";
      clientId: string;
      username: string;
      privateKey: string;
      loginUrl?: string;
    };

export interface PaymentEvent {
  timestamp: string;
  type: string;
  orderId?: number;
  customerEmail?: string;
  status?: string;
  amount?: string;
  message: string;
}
