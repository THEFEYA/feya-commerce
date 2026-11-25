export type WithdrawalLanguage = 'en' | 'nl' | 'de';

export function isWithdrawalLanguage(value: unknown): value is WithdrawalLanguage {
  return value === 'en' || value === 'nl' || value === 'de';
}

const en = {
  language: 'Form language', start: 'Cancel contract here', confirm: 'Confirm cancellation',
  intro: 'Identify your purchase and choose the email address for your acknowledgement.',
  name: 'Name', contract: 'Order number or other identifying details',
  hint: 'You can use the item name and order date if you do not have the order number.',
  email: 'Email for your acknowledgement', emailError: 'Enter a full email address for your acknowledgement.',
  privacy: 'How TheFEYA uses your information', review: 'Review your statement', edit: 'Edit details',
  declaration: 'I hereby withdraw from the contract identified below.',
  receipt: 'Withdrawal receipt', received: 'TheFEYA has received your withdrawal statement.',
  saved: 'You can save a copy of your statement and its submission time below.',
  notified: 'Acknowledgement sent to', order: 'Order or purchase', seller: 'Contracting seller',
  reference: 'Receipt reference', time: 'Submitted at (UTC)', sending: 'Sending your statement…',
  invalid: 'Check your details and try again.', wait: 'Please wait a moment, or email your notice now.',
  conflict: 'We could not confirm these details for this submission. You can email your notice now.',
  failed: 'We could not confirm receipt. Try again with the same details or email your notice now.',
  copy: 'Copy receipt', copied: 'Receipt copied.', download: 'Download receipt', print: 'Print receipt',
  copyFailed: 'Select the receipt text to copy it, or use the download button.',
  direct: 'You can also send your statement directly to the seller by email.',
};

type WithdrawalCopy = typeof en;

const nl: WithdrawalCopy = {
  language: 'Taal van het formulier', start: 'Hier de overeenkomst ontbinden', confirm: 'Ontbinding bevestigen',
  intro: 'Vermeld om welke aankoop het gaat en kies het e-mailadres voor uw bevestiging.',
  name: 'Naam', contract: 'Bestelnummer of andere gegevens waarmee we uw aankoop kunnen vinden',
  hint: 'Heeft u geen bestelnummer? Vermeld dan de naam van het artikel en de besteldatum.',
  email: 'E-mailadres voor uw bevestiging', emailError: 'Vul een volledig e-mailadres in voor uw bevestiging.',
  privacy: 'Hoe TheFEYA uw gegevens gebruikt', review: 'Verklaring controleren', edit: 'Gegevens wijzigen',
  declaration: 'Hierbij ontbind ik de hieronder vermelde overeenkomst.',
  receipt: 'Ontvangstbevestiging van uw ontbinding', received: 'TheFEYA heeft uw verklaring van ontbinding ontvangen.',
  saved: 'Hieronder kunt u een kopie van uw verklaring met de datum en tijd van indiening opslaan.',
  notified: 'Bevestiging verzonden naar', order: 'Bestelling of aankoop', seller: 'Verkoper',
  reference: 'Bevestigingsnummer', time: 'Ingediend op (UTC)', sending: 'Uw verklaring wordt verzonden…',
  invalid: 'Controleer uw gegevens en probeer het opnieuw.', wait: 'Wacht even of mail uw verklaring direct.',
  conflict: 'We konden deze inzending niet bevestigen. U kunt uw verklaring direct per e-mail sturen.',
  failed: 'We konden de ontvangst niet bevestigen. Probeer het opnieuw met dezelfde gegevens of mail uw verklaring direct.',
  copy: 'Bevestiging kopiëren', copied: 'Bevestiging gekopieerd.', download: 'Bevestiging downloaden', print: 'Bevestiging afdrukken',
  copyFailed: 'Selecteer de bevestigingstekst om deze te kopiëren of gebruik de downloadknop.',
  direct: 'U kunt uw verklaring ook rechtstreeks per e-mail naar de verkoper sturen.',
};

const de: WithdrawalCopy = {
  language: 'Formularsprache', start: 'Vertrag widerrufen', confirm: 'Widerruf bestätigen',
  intro: 'Geben Sie Ihren Kauf und die E-Mail-Adresse für die Eingangsbestätigung an.',
  name: 'Name', contract: 'Bestellnummer oder andere Angaben zum Kauf',
  hint: 'Wenn Sie die Bestellnummer nicht zur Hand haben, können Sie den Artikel und das Bestelldatum angeben.',
  email: 'E-Mail-Adresse für die Eingangsbestätigung', emailError: 'Geben Sie eine vollständige E-Mail-Adresse für die Bestätigung ein.',
  privacy: 'So verwendet TheFEYA Ihre Daten', review: 'Erklärung prüfen', edit: 'Angaben ändern',
  declaration: 'Hiermit widerrufe ich den unten bezeichneten Vertrag.',
  receipt: 'Eingangsbestätigung Ihres Widerrufs', received: 'Ihre Widerrufserklärung ist bei TheFEYA eingegangen.',
  saved: 'Unten können Sie Ihre Erklärung mit dem Datum und der Uhrzeit der Übermittlung speichern.',
  notified: 'Bestätigung gesendet an', order: 'Bestellung oder Kauf', seller: 'Vertraglicher Verkäufer',
  reference: 'Bestätigungsnummer', time: 'Übermittelt am (UTC)', sending: 'Ihre Erklärung wird übermittelt…',
  invalid: 'Prüfen Sie Ihre Angaben und versuchen Sie es erneut.', wait: 'Warten Sie kurz oder senden Sie Ihren Widerruf jetzt per E-Mail.',
  conflict: 'Wir konnten diese Angaben nicht bestätigen. Sie können Ihren Widerruf jetzt per E-Mail senden.',
  failed: 'Wir konnten den Eingang nicht bestätigen. Versuchen Sie es mit denselben Angaben erneut oder senden Sie Ihren Widerruf per E-Mail.',
  copy: 'Bestätigung kopieren', copied: 'Bestätigung kopiert.', download: 'Bestätigung herunterladen', print: 'Bestätigung drucken',
  copyFailed: 'Markieren Sie den Text zum Kopieren oder verwenden Sie die Download-Schaltfläche.',
  direct: 'Sie können Ihren Widerruf auch direkt per E-Mail an den Verkäufer senden.',
};

export const withdrawalCopy: Record<WithdrawalLanguage, WithdrawalCopy> = {en, nl, de};
