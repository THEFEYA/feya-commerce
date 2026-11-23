// Private standalone Apps Script. No web app, mailbox read access or API keys.
const WITHDRAWAL_ENDPOINT = 'https://thefeya.com/api/internal/withdrawal-delivery';
const WITHDRAWAL_ACCOUNT = 'manager.feya@gmail.com';
const REPORT_PROPERTY = 'pendingWithdrawalMailReport';

function ownerIdentity_() {
  const token = ScriptApp.getIdentityToken();
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    throw new Error('The withdrawal worker needs its Google identity permission.');
  }
  const claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split('.')[1])).getDataAsString());
  if (claims.email !== WITHDRAWAL_ACCOUNT || claims.email_verified !== true || !claims.aud) {
    throw new Error('Install the withdrawal worker from the designated studio Google account.');
  }
  return {token: token, audience: claims.aud};
}

function installWithdrawalWorker() {
  const identity = ownerIdentity_();
  const alreadyInstalled = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'runWithdrawalWorker';
  });
  if (!alreadyInstalled) ScriptApp.newTrigger('runWithdrawalWorker').timeBased().everyMinutes(5).create();
  // This public OAuth client ID is all that the site operator pairs. Never log the ID token.
  console.log('Withdrawal worker OAuth audience: ' + identity.audience);
}

function requestWithdrawal_(token, fields) {
  const response = UrlFetchApp.fetch(WITHDRAWAL_ENDPOINT, {
    method: 'post', followRedirects: false, validateHttpsCertificates: true, muteHttpExceptions: true,
    contentType: 'application/json', headers: {Authorization: 'Bearer ' + token}, payload: JSON.stringify(fields)
  });
  if (response.getResponseCode() !== 200) throw new Error('The withdrawal service did not accept this request.');
  const result = JSON.parse(response.getContentText());
  if (result.ok !== true) throw new Error('The withdrawal service is unavailable.');
  return result;
}

function flushReport_(token, properties) {
  const raw = properties.getProperty(REPORT_PROPERTY);
  if (raw === null) return;
  const result = requestWithdrawal_(token, JSON.parse(raw));
  // An already reconciled/superseded attempt cannot change the notice. Either reply is terminal for this report.
  if (typeof result.accepted !== 'boolean') throw new Error('The withdrawal receipt could not be confirmed.');
  properties.deleteProperty(REPORT_PROPERTY);
}

function runWithdrawalWorker() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const token = ownerIdentity_().token;
    const properties = PropertiesService.getScriptProperties();
    flushReport_(token, properties);
    for (let i = 0; i < 4; i++) {
      const remaining = MailApp.getRemainingDailyQuota();
      const job = requestWithdrawal_(token, {action: 'take', remaining: remaining}).job;
      if (!job) break;
      const report = {action: 'report', job_id: job.job_id, attempt_id: job.attempt_id, outcome: 'unknown'};
      // The only local values retained are an opaque job, attempt and status. Save before touching mail.
      properties.setProperty(REPORT_PROPERTY, JSON.stringify(report));
      try {
        MailApp.sendEmail({to: job.to, subject: job.subject, body: job.body, name: 'TheFEYA'});
      } catch (error) {
        flushReport_(token, properties);
        break;
      }
      // MailApp returns void. It has accepted this call, not proved receipt by the customer's inbox.
      report.outcome = 'submitted';
      properties.setProperty(REPORT_PROPERTY, JSON.stringify(report));
      flushReport_(token, properties);
    }
  } finally {
    lock.releaseLock();
  }
}
