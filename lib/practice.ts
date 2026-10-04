export type Question = {id:string; chapter:number; sourceNumber:string; page:number; type:string; text:string; answer:string; canonical:string|string[]; images:string[]; originalImages:string[]; analysisImages:string[]; note:string; ungraded?:boolean};
export type Result = {answer:string; correct:boolean|null; questionId:string; at:string};
export type State = {name:string; avatar:string|null; total:number; correct:number; seen:Record<string,number>; wrong:Record<string,{streak:number; count:number}>; session:null|{id:string; mode:string; chapter:number; queue:string[]; cursor:number; history:Result[]}};
export function initialState(name:string):State {return {name,avatar:null,total:0,correct:0,seen:{},wrong:{},session:null};}
export function normalize(value:string){
  // Whitespace within quoted strings is meaningful Python output.
  let quote='',out='';const s=value.trim().replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/（/g,'(').replace(/）/g,')').replace(/，/g,',');
  for(let i=0;i<s.length;i++){const c=s[i];if(quote){if(c===quote&&s[i-1]!=='\\'){quote='';out+='"';}else out+=c;}else if(c==='"'||c==="'"){quote=c;out+='"';}else if(!/\s/.test(c))out+=c;}
  return out;
}
export function grade(q:Question,answer:string):boolean|null{
  if(q.ungraded||q.type==='disputed')return null;
  if(q.type==='multi')return [...new Set(answer.toUpperCase().split('').filter(x=>/[A-D]/.test(x)))].sort().join('')===(q.canonical as string[]).join('');
  return normalize(answer)===normalize(q.answer);
}
export function startSession(state:State,bank:Question[],mode:string,chapter:number){
  if(!['order','random','wrong'].includes(mode))throw Error('练习模式无效');
  const queue=bank.filter(q=>(!chapter||q.chapter===chapter)&&(mode!=='wrong'||!!state.wrong[q.id])).map(q=>q.id);
  if(mode==='random')for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
  state.session={id:crypto.randomUUID(),mode,chapter,queue,cursor:0,history:[]};return state;
}
export function recordAnswer(state:State,q:Question,answer:string):Result{
  const s=state.session;if(!s||s.queue[s.cursor]!==q.id)throw Error('题目已变化，请同步进度');
  const correct=grade(q,answer),result={answer,correct,questionId:q.id,at:new Date().toISOString()};
  if(correct!==null){state.total++;if(correct)state.correct++;state.seen[q.id]=(state.seen[q.id]||0)+1;
    if(!correct)state.wrong[q.id]={streak:0,count:(state.wrong[q.id]?.count||0)+1};
    else if(state.wrong[q.id]){state.wrong[q.id].streak++;if(state.wrong[q.id].streak>=3)delete state.wrong[q.id];}}
  s.history.push(result);s.cursor++;return result;
}
