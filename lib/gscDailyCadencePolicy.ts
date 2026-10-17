/**
 * GDAE daily GSC evidence cadence policy.
 *
 * A missing provider day is not zero. A paused daily job cannot silently
 * skip historical Google partitions when the bounded 14-day read window rolls.
 * This does not authorize GSC credential expansion or paid GMEL execution.
 */
export type DailyGscCadence = {
  allowed: boolean;
  code: 'GSC_DAILY_DISABLED'|'GSC_DAILY_NOT_PRODUCTION'
    |'GSC_DAILY_FIRST_RECEIPT_REQUIRED'|'GSC_DAILY_BAD_WATERMARK'
    |'GSC_DAILY_ALREADY_COVERED'|'GSC_DAILY_BACKFILL_REQUIRED'
    |'GSC_DAILY_CLOCK_INVALID'|'GSC_DAILY_RUN_ALLOWED';
  query_window: {start_date:string;end_date:string}|null;
  previous_final_date: string|null;
  source_health_promoted: false;
};

type Env = Readonly<Record<string,string|undefined>>;

const iso=/^\d{4}-\d{2}-\d{2}$/;
function dateValid(value:unknown):value is string {
  if(typeof value!=='string'||!iso.test(value))return false;
  const date=new Date(value+'T00:00:00.000Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function day(date:string,offset:number):string {
  return new Date(Date.parse(date+'T00:00:00.000Z')+offset*86400000)
    .toISOString().slice(0,10);
}

/** Google dates use Pacific Time independently of the server's deployment region. */
export function expectedFinalGscWindow(now:Date):{start_date:string;end_date:string}|null {
  if(!Number.isFinite(now.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(now);
  const get=(key:string)=>parts.find(x=>x.type===key)?.value;
  const yy=get('year'),mm=get('month'),dd=get('day');
  if(!yy||!mm||!dd)return null;
  const today=yy+'-'+mm+'-'+dd;
  if(!dateValid(today))return null;
  return {start_date:day(today,-16),end_date:day(today,-3)};
}

export function decideDailyGscCadence(
  env:Env,
  previousFinalDate:string|null,
  now:Date=new Date(),
):DailyGscCadence{
  const window=expectedFinalGscWindow(now);
  const blocked=(code:DailyGscCadence['code']):DailyGscCadence=>({
    allowed:false,code,query_window:window,previous_final_date:previousFinalDate,
    source_health_promoted:false,
  });
  if(!window)return blocked('GSC_DAILY_CLOCK_INVALID');
  if(env.VERCEL_ENV!=='production'||env.VERCEL_GIT_COMMIT_REF!=='main')
    return blocked('GSC_DAILY_NOT_PRODUCTION');
  if(env.FEYA_GSC_DAILY_ENABLED!=='true'
    ||env.FEYA_GSC_READ_ENABLED!=='true'
    ||env.FEYA_GSC_CAPTURE_ENABLED!=='true')return blocked('GSC_DAILY_DISABLED');

  // First bootstrap must be owner-confirmed, never an unattended provider write.
  if(previousFinalDate===null)return blocked('GSC_DAILY_FIRST_RECEIPT_REQUIRED');
  if(!dateValid(previousFinalDate))return blocked('GSC_DAILY_BAD_WATERMARK');

  if(previousFinalDate>=window.end_date)
    return previousFinalDate===window.end_date
      ?blocked('GSC_DAILY_ALREADY_COVERED')
      :blocked('GSC_DAILY_BAD_WATERMARK');

  // Missing more than the 14-day rolling window requires an approved backfill.
  // If previous final day is Sep 1, window starts Sep 3, Sep 2 is irretrievable.
  if(day(previousFinalDate,1)<window.start_date)
    return blocked('GSC_DAILY_BACKFILL_REQUIRED');

  return {
    allowed:true,code:'GSC_DAILY_RUN_ALLOWED',
    query_window:window,previous_final_date:previousFinalDate,
    source_health_promoted:false,
  };
}
