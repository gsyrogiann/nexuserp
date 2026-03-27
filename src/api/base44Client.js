import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

/**
 * NEXUS ERP - ENTITY DEFINITIONS
 * Εδώ ορίζουμε τα "κουτιά" της βάσης δεδομένων
 */
base44.entities = {
  Customer: "Customer",
  Product: "Product",
  SalesInvoice: "SalesInvoice",
  Payment: "Payment",
  CallLog: "CallLog",      // Το κουτί για τις κλήσεις 3CX
  AppSettings: "AppSettings", // Το κουτί για τα API Keys (3CX, myDATA, Courier)
  UnifiedMessage: "UnifiedMessage" // Το κανάλι επικοινωνίας με το κινητό (Telegram/WhatsApp)
};
