import rawBank from '../data/questions.json';
import {initialState,startSession,recordAnswer} from './practice';
import type {State,Question,Result} from './practice';
import {validateState,parseBackup,packBackup} from './backup';
const bank=rawBank as Question[];
const metadata=bank.map(q=>({id:q.id,chapter:q.chapter,sourceNumber:q.sourceNumber,page:q.page,type:q.type,title:q.text.slice(0,100),note:q.note,ungraded:q.ungraded}));
type Saved={version:number;state:State};
type Data=Saved&{bank:typeof metadata;email:string;result:Result};
let database:Promise<IDBDatabase>|undefined;
function db(){
  if(!database)database=new Promise<IDBDatabase>((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(Error('当前环境不支持本机保存，请使用支持存储的浏览器打开'));return;}
    const r=indexedDB.open('python-afuke-practice-v1',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('records');
    r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();database=undefined;};resolve(r.result);};
    r.onerror=()=>{database=undefined;reject(Error('无法打开本机存储，请检查是否禁用了网站存储'));};
    r.onblocked=()=>{database=undefined;reject(Error('请关闭其他刷题页面后重试'));};
  });
  return database;
}
// The state and its revision are changed in one IndexedDB transaction. Concurrent
// tabs cannot overwrite each other's newer answers; failed writes never report success.
async function access(update?:(old:Saved,store:IDBObjectStore)=>Saved):Promise<Saved>{
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction('records',update?'readwrite':'readonly'),store=tx.objectStore('records');
    let answer:Saved,error:Error|undefined;
    const read=store.get('current');
    read.onsuccess=()=>{try{
      const old:Saved=read.result||{version:0,state:initialState('同学')};
      if(!Number.isSafeInteger(old.version)||old.version<0)throw Error('本机记录异常，请通过备份恢复');
      old.state=validateState(old.state,bank);
      answer=update?update(old,store):old;
      if(update)store.put(answer,'current');
    }catch(e){error=e as Error;tx.abort();}};
    tx.oncomplete=()=>resolve(answer);
    tx.onabort=()=>reject(error||Error('本机保存失败（可能存储空间不足），本次操作未计入。请释放空间后重试。'));
    tx.onerror=()=>{};
  });
}
const full=(saved:Saved,result?:Result)=>({...saved,bank:metadata,email:'',result}) as Data;
const blobText=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('头像读取失败'));r.readAsDataURL(blob);});
export async function api<T=Data>(url:string,options?:RequestInit):Promise<T>{
  if(url.startsWith('/api/practice?question=')){
    const q=bank.find(q=>q.id===decodeURIComponent(url.split('=')[1]));if(!q)throw Error('题目不存在');return structuredClone(q) as T;
  }
  if(!options?.method||options.method==='GET')return full(await access()) as T;
  const payload=url==='/api/avatar'?{action:'avatar',avatar:await blobText(options.body as Blob),version:Number((options.headers as Record<string,string>)['X-State-Version'])}:JSON.parse(String(options.body));
  let result:Result|undefined;
  const saved=await access(old=>{
    if(payload.version!==old.version)throw Error('另一页面已更新记录，请点击“重新读取”后继续');
    const state=old.state;
    if(payload.action==='start'){
      if(!Number.isInteger(payload.chapter)||payload.chapter<0||payload.chapter>6)throw Error('章节无效');
      startSession(state,bank,payload.mode,payload.chapter);
    }else if(payload.action==='answer'){
      const s=state.session;
      if(!s||payload.sessionId!==s.id||payload.position!==s.cursor)throw Error('题目已变化，请重新读取进度');
      const q=bank.find(q=>q.id===s.queue[s.cursor]);
      if(!q||typeof payload.answer!=='string'||payload.answer.length>1000)throw Error('答案无效');
      if(q.type==='choice'&&!/^[A-D]$/.test(payload.answer))throw Error('请选择一个选项');
      result=recordAnswer(state,q,payload.answer);
    }else if(payload.action==='jump'){
      const s=state.session;
      if(!s||payload.sessionId!==s.id||!Number.isInteger(payload.position)||payload.position<s.cursor||payload.position>=s.queue.length)throw Error('题目位置已变化，请重新读取进度');
      const selected=s.queue[payload.position];
      s.queue=s.queue.slice(0,s.cursor).concat([selected],s.queue.slice(s.cursor).filter((_,i)=>i!==payload.position-s.cursor));
    }else if(payload.action==='favorite'){
      if(!bank.some(q=>q.id===payload.questionId)||typeof payload.value!=='boolean')throw Error('收藏题目无效');
      if(payload.value)state.favorites[payload.questionId]=true;else delete state.favorites[payload.questionId];
    }else if(payload.action==='profile'){
      if(typeof payload.name!=='string'||!payload.name.trim()||payload.name.trim().length>40)throw Error('昵称须为 1 至 40 个字符');
      state.name=payload.name.trim();
    }else if(payload.action==='avatar')state.avatar=payload.avatar;
    else throw Error('操作无效');
    return {version:old.version+1,state:validateState(state,bank)};
  });
  navigator.storage?.persist?.().catch(()=>{});
  return full(saved,result) as T;
}
export async function exportBackup(){return packBackup((await access()).state);}
export async function importBackup(text:string){
  const state=parseBackup(text,bank);
  await access((old,store)=>{store.put(old,'before-last-import');return {version:old.version+1,state};});
}
