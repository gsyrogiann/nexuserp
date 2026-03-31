import React, { createContext, useContext, useState } from 'react';

const translations = {
  el: {
    // Nav groups
    'Overview': 'Επισκόπηση',
    'CRM': 'CRM',
    'Catalog': 'Κατάλογος',
    'Service': 'Υπηρεσία',
    'Sales': 'Πωλήσεις',
    'Purchasing': 'Αγορές',
    'Finance': 'Οικονομικά',
    'Email': 'Email',
    'Administration': 'Διαχείριση',
    // Nav items
    'Dashboard': 'Πίνακας',
    'Calendar': 'Ημερολόγιο',
    'Customers': 'Πελάτες',
    'Suppliers': 'Προμηθευτές',
    'Sales Pipeline': 'Pipeline',
    'Products': 'Προϊόντα',
    'Inventory': 'Απόθεμα',
    'Tickets': 'Tickets',
    'Quotes': 'Προσφορές',
    'Sales Orders': 'Παραγγελίες',
    'Sales Invoices': 'Τιμολόγια',
    'Purchase Orders': 'Εντολές Αγοράς',
    'Purchase Invoices': 'Τιμολόγια Αγοράς',
    'Payments': 'Πληρωμές',
    'Reports': 'Αναφορές',
    'Email Settings': 'Ρυθμίσεις Email',
    'Unmatched Emails': 'Αταίριαστα Email',
    'Nexus AI Admin': 'Nexus AI',
    'Ρυθμίσεις': 'Ρυθμίσεις',
    // Common actions
    'Save': 'Αποθήκευση',
    'Cancel': 'Ακύρωση',
    'Delete': 'Διαγραφή',
    'Edit': 'Επεξεργασία',
    'Add': 'Προσθήκη',
    'Search': 'Αναζήτηση',
    'Filter': 'Φίλτρο',
    'Close': 'Κλείσιμο',
    'Confirm': 'Επιβεβαίωση',
    'Create': 'Δημιουργία',
    'Update': 'Ενημέρωση',
    'View': 'Προβολή',
    'Back': 'Πίσω',
    'Next': 'Επόμενο',
    'Yes': 'Ναι',
    'No': 'Όχι',
    'Loading...': 'Φόρτωση...',
    'No data': 'Δεν υπάρχουν δεδομένα',
    // Status
    'active': 'Ενεργός',
    'inactive': 'Ανενεργός',
    'blocked': 'Αποκλεισμένος',
    'open': 'Ανοιχτό',
    'closed': 'Κλειστό',
    'pending': 'Εκκρεμεί',
    'in_progress': 'Σε εξέλιξη',
    'done': 'Ολοκληρώθηκε',
    'draft': 'Πρόχειρο',
    'issued': 'Εκδοθέν',
    'sent': 'Στάλθηκε',
    'paid': 'Πληρώθηκε',
    'overdue': 'Εκπρόθεσμο',
    'cancelled': 'Ακυρώθηκε',
    // Pages
    'Settings': 'Ρυθμίσεις',
    'Language': 'Γλώσσα',
    'Greek': 'Ελληνικά',
    'English': 'Αγγλικά',
  },
  en: {}  // English is the default, keys are already in English
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('nexus_lang') || 'el');

  const t = (key) => {
    if (lang === 'en') return key;
    return translations.el[key] || key;
  };

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem('nexus_lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, t, changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}