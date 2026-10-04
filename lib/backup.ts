import {grade} from './practice.ts';
import type {State,Question} from './practice.ts';
export const SOURCE_SHA='c077cf07a1256990be7bdf3efd00655956d50325810c42249ca451f426cec0b3';
const fail=()=>{throw Error('备份内容无效或不完整，当前记录未被修改');};
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v:any,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validateState(value:unknown,bank:Question[]):State{
  const s=value as State,byId=new Map(bank.map(q=>[q.id,q]));
  if(!object(s)||typeof s.name!=='string'||!s.name.trim()||s.name.length>40)fail();
  if(s.avatar!==null&&(typeof s.avatar!=='string'||s.avatar.length>600000||!/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(s.avatar)))fail();
  if(!int(s.total)||!int(s.correct,0,s.total)||!object(s.seen)||!object(s.wrong))fail();
  const favorites=s.favorites??{};
  if(!object(favorites)||Object.entries(favorites).some(([id,v])=>!byId.has(id)||v!==true))fail();
  let seenTotal=0;
  for(const [id,count] of Object.entries(s.seen)){if(!byId.has(id)||!int(count,1)||byId.get(id)!.ungraded)fail();seenTotal+=count;}
  if(seenTotal!==s.total)fail();
  for(const [id,w] of Object.entries(s.wrong)){if(!byId.has(id)||byId.get(id)!.ungraded||!object(w)||!int(w.streak,0,2)||!int(w.count,1,s.seen[id]||0))fail();}
  if(s.session!==null){
    const t=s.session;
    if(!object(t)||typeof t.id!=='string'||!t.id||t.id.length>100||!['order','random','wrong','favorites','unseen'].includes(t.mode)||!int(t.chapter,0,6)||!Array.isArray(t.queue)||t.queue.length>bank.length||new Set(t.queue).size!==t.queue.length||!int(t.cursor,0,t.queue.length)||!Array.isArray(t.history)||t.history.length!==t.cursor)fail();
    for(const id of t.queue){const q=byId.get(id);if(!q||(t.chapter!==0&&q.chapter!==t.chapter))fail();}
    let graded=0;
    for(const [i,r] of t.history.entries()){
      if(!object(r)||r.questionId!==t.queue[i]||typeof r.answer!=='string'||r.answer.length>1000||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at)))fail();
      if(r.correct!==grade(byId.get(r.questionId)!,r.answer))fail();
      if(r.correct!==null){graded++;if(!s.seen[r.questionId])fail();}
    }
    if(graded>s.total)fail();
  }
  // Keep only known, validated fields instead of importing arbitrary object keys.
  return {name:s.name,avatar:s.avatar,total:s.total,correct:s.correct,seen:{...s.seen},favorites:{...favorites},wrong:Object.fromEntries(Object.entries(s.wrong).map(([id,w])=>[id,{streak:w.streak,count:w.count}])),session:s.session?{id:s.session.id,mode:s.session.mode,chapter:s.session.chapter,queue:[...s.session.queue],cursor:s.session.cursor,history:s.session.history.map(r=>({questionId:r.questionId,answer:r.answer,correct:r.correct,at:r.at}))}:null};
}
export function packBackup(state:State){return JSON.stringify({app:'python-afuke-practice',format:1,sourceSha256:SOURCE_SHA,exportedAt:new Date().toISOString(),state});}
export function parseBackup(text:string,bank:Question[]){
  if(text.length>4*1024*1024)throw Error('备份内容过大');
  let b;try{b=JSON.parse(text);}catch{throw Error('备份不是有效的 JSON，请选择完整备份文件或粘贴完整文本');}
  if(!object(b)||b.app!=='python-afuke-practice'||b.format!==1||b.sourceSha256!==SOURCE_SHA)throw Error('这不是当前题库的备份，当前记录未被修改');
  return validateState(b.state,bank);
}
