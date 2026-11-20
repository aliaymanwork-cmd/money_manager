import { createClient } from 'npm:@supabase/supabase-js@2.49.10';
import webpush from 'npm:web-push@3.6.7';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const todayIn = (zone: string, date=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const hourIn = (zone: string) => Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(new Date()));
const dateOffset = (ymd: string,days: number) => {const d=new Date(ymd+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const dueDate = (month:string,day:number) => {const [year,m]=month.split('-').map(Number);const max=new Date(Date.UTC(year,m,0)).getUTCDate();return month+'-'+String(Math.min(Math.max(day||1,1),max)).padStart(2,'0')};
const nextMonth = (ymd:string) => {const [y,m]=ymd.split('-').map(Number);return new Date(Date.UTC(y,m,1)).toISOString().slice(0,7)};

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method==='GET')return json({publicKey:Deno.env.get('VAPID_PUBLIC_KEY')||null,ready:!!(Deno.env.get('VAPID_PUBLIC_KEY')&&Deno.env.get('VAPID_PRIVATE_KEY')&&Deno.env.get('PUSH_CRON_SECRET'))});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const expected=Deno.env.get('PUSH_CRON_SECRET');
 if(!expected||expected.length<24||req.headers.get('x-push-cron-secret')!==expected)return json({error:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY');
 if(!url||!key||!publicKey||!privateKey)return json({error:'Push delivery is not configured'},503);
 const contact=(Deno.env.get('VAPID_CONTACT_EMAIL')||'admin@example.com').trim();
 webpush.setVapidDetails(contact.startsWith('mailto:')?contact:'mailto:'+contact,publicKey,privateKey);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:subs,error:subError}=await db.from('push_subscriptions').select('*').limit(1000);
 if(subError)return json({error:'Subscription lookup failed'},500);
 let sent=0,skipped=0,failed=0;
 const users=[...new Set((subs||[]).map(x=>x.user_id))];
 for(const userId of users){
  const userSubs=(subs||[]).filter(x=>x.user_id===userId);
  const {data:pref}=await db.from('push_preferences').select('*').eq('user_id',userId).maybeSingle();
  if(pref?.enabled===false)continue;
  const timezone=pref?.timezone||'Asia/Dubai';
  let today:string,hour:number;
  try{today=todayIn(timezone);hour=hourIn(timezone)}catch(_){continue}
  if(hour!==(pref?.notification_hour??9))continue;
  const offsets=pref?.days_before||[3,1,0], events:{key:string,title:string,body:string}[]=[];
  const {data:loans}=await db.from('debts').select('id,name,balance,emi,emi_type,due_day,country,currency').eq('user_id',userId).gt('balance',0);
  const {data:plans}=await db.from('debt_monthly_emis').select('debt_id,month,amount').eq('user_id',userId);
  const {data:payments}=await db.from('entries').select('debt_id,amount,date').eq('user_id',userId).eq('kind','loanpay').gte('date',today.slice(0,7)+'-01');
  for(const loan of loans||[]){
   const day=Number(loan.due_day)||1;
   for(const offset of offsets){
    const target=dateOffset(today,Number(offset));
    if(dueDate(target.slice(0,7),day)!==target)continue;
    const plan=(plans||[]).find(p=>p.debt_id===loan.id&&p.month.slice(0,7)===target.slice(0,7));
    if(loan.emi_type==='irregular'&&!plan)continue;
    const expected=loan.emi_type==='irregular'?Number(plan.amount):Number(loan.emi);
    const paid=(payments||[]).filter(p=>p.debt_id===loan.id&&p.date.slice(0,7)===target.slice(0,7)).reduce((n,p)=>n+Number(p.amount),0);
    if(expected<=0||paid>=expected)continue;
    events.push({key:`emi:${loan.id}:${target}:${offset}`,title:offset===0?'EMI due today':`EMI due in ${offset} day${offset===1?'':'s'}`,body:`${loan.name} — open PocketPlan to review your payment.`});
   }
   if(pref?.notify_irregular_unset!==false&&loan.emi_type==='irregular'){
    const month=nextMonth(today);
    if(!(plans||[]).some(p=>p.debt_id===loan.id&&p.month.slice(0,7)===month)){
      events.push({key:`unset:${loan.id}:${month}`,title:'Set next month’s EMI',body:`${loan.name}: next month's EMI amount is not entered yet.`});
    }
   }
  }
  for(const event of events){
   for(const sub of userSubs){
    const {data:claimed,error:claimError}=await db.rpc('pocketplan_claim_push_delivery',{p_subscription_id:sub.id,p_event_key:event.key});
    if(claimError||!claimed){skipped++;continue}
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:event.title,body:event.body,url:'/',tag:event.key,badgeCount:events.length}),{TTL:86400,urgency:'normal'});
      sent++;
    }catch(e){
      failed++;
      const status=Number((e as {statusCode?:number}).statusCode);
      if(status===404||status===410)await db.from('push_subscriptions').delete().eq('id',sub.id);
      else await db.rpc('pocketplan_release_push_delivery',{p_subscription_id:sub.id,p_event_key:event.key});
    }
   }
  }
 }
 return json({ok:true,sent,skipped,failed});
});
