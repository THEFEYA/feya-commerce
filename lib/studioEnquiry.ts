export const STUDIO_EMAIL = 'manager.feya@gmail.com';
export const ORDER_QUESTION = {label:'Other order question', order:true, hint:'Tell us which piece you ordered and how we can help.'} as const;
export const ORDER_HELP_HASH = '#order-help';
export const ORDER_HELP_PATH = '/contact' + ORDER_HELP_HASH;
const handoffKey = 'thefeya:order-help';
const numberPattern = /^FEYA-[0-9]{6,9}$/;

export const STUDIO_TOPICS = [
  {label:'Product or fit', order:false, hint:'Tell us which design or size you have in mind.'},
  {label:'Custom design request', order:false, hint:'Tell us which piece you would like to customise.'},
  {label:'Press or collaboration', order:false, hint:'Briefly describe your project and how you would like to work with the studio.'},
  ORDER_QUESTION,
  {label:'Size, colour or item differs from my order', order:true, hint:'Describe what you ordered and what arrived. A photo in your email is optional.'},
  {label:'Damaged or faulty item', order:true, hint:'Describe the damage or fault. A photo in your email is optional.'},
  {label:'Tracking or delivery delay', order:true, hint:'Tell us the last tracking update and when you saw it, if available.'},
  {label:'Change or cancel my order', order:true, hint:'Tell us what changed. For a made-to-measure piece or a change of event plans, we’ll check what is still possible.'},
  {label:'Return or exchange', order:true, hint:'Tell us which item you would like to return or exchange.'},
] as const;

export type StudioTopic = typeof STUDIO_TOPICS[number];

// Only a public display number travels within this tab. Never store the receipt
// link or the buyer's message. The contact page consumes the value once.
export function saveSupportOrderNumber(value: string) {
  try {
    if (numberPattern.test(value)) window.sessionStorage.setItem(handoffKey,value);
    else window.sessionStorage.removeItem(handoffKey);
  } catch { /* Storage can be disabled; a buyer can still type the number. */ }
}

export function takeSupportOrderNumber(): string {
  try {
    const value = window.sessionStorage.getItem(handoffKey) || '';
    window.sessionStorage.removeItem(handoffKey);
    return numberPattern.test(value) ? value : '';
  } catch {
    return '';
  }
}

export function studioEnquiryMailto(topic: StudioTopic, orderNumber: string, message: string): string {
  const number = topic.order ? orderNumber.trim() : '';
  const subject = 'TheFEYA · ' + topic.label;
  const text = [number && 'Order number: ' + number, message.trim()].filter(Boolean).join('\n\n');
  return 'mailto:' + STUDIO_EMAIL + '?subject=' + encodeURIComponent(subject)
    + '&body=' + encodeURIComponent(text);
}
