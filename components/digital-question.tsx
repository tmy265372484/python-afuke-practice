import digitalData from '../data/digital.json';
import {Fragment} from 'react';
type Block={kind:string;text?:string;sup?:number[];indent?:number;src?:string;width?:number;height?:number};
type Digital={body:Block[];options:{label:string;blocks:Block[]}[];explanation:Block[]};
const bank=digitalData as Record<string,Digital>;
function Text({block}:{block:Block}){
  const s=block.text||'';
  if(!block.sup?.length)return <>{s}</>;
  const supers=new Set(block.sup);return <>{Array.from(s).map((c,i)=>supers.has(i)?<sup key={i}>{c}</sup>:<Fragment key={i}>{c}</Fragment>)}</>;
}
export function Blocks({blocks}:{blocks:Block[]}){return <div className="digital-blocks">{blocks.map((b,i)=>b.kind==='image'?<figure key={i} className="code-figure"><img src={'.'+b.src} alt="原题中的代码或图示" width={b.width} height={b.height} style={{maxWidth:Math.min(b.width||600,760)}}/></figure>:<div key={i} className={b.kind==='code'?'code-line':'text-line'} style={b.kind==='code'?{paddingInlineStart:`${Math.min(b.indent||0,24)*.55+0.7}em`}:undefined}><Text block={b}/></div>)}</div>;}
export function DigitalBody({id}:{id:string}){return <div className="digital-stem"><Blocks blocks={bank[id].body}/></div>;}
export function DigitalOptions({id,disabled,onChoose,selected=[],result}:{id:string;disabled?:boolean;onChoose?:(a:string)=>void;selected?:string[];result?:{answer:string;correct:boolean|null;canonical:string|string[]}}){
  return <div className="electronic-options">{bank[id].options.map(o=>{
    const correct=result?.correct!==null&&result!==undefined&&(Array.isArray(result.canonical)?result.canonical.includes(o.label):result.canonical===o.label);
    const chosen=result?result.answer.includes(o.label):selected.includes(o.label);
    return <button type="button" key={o.label} className={'electronic-option '+(selected.includes(o.label)?'selected ':'')+(correct?'is-correct ':result&&chosen?'is-wrong ':'')} disabled={disabled} aria-label={'选择 '+o.label} aria-pressed={chosen} onClick={()=>onChoose?.(o.label)}><span className="letter-chip">{o.label}</span><Blocks blocks={o.blocks}/>{correct&&<span className="option-mark" aria-label="原书正确答案">✓</span>}</button>;
  })}</div>;
}
export function DigitalExplanation({id}:{id:string}){return <div className="digital-explanation"><Blocks blocks={bank[id].explanation}/></div>;}
export function Bunny({small=false}:{small?:boolean}){return <svg className={small?'bunny small':'bunny'} viewBox="0 0 180 155" role="img" aria-label="陪你学习的小兔子"><ellipse cx="90" cy="145" rx="62" ry="7" fill="#e7d8f4"/><path d="M50 70C20 11 52-11 72 59M109 61C118-4 151 4 133 77" fill="#fff7ed" stroke="#785987" strokeWidth="4"/><path d="M50 24l14 33m65-33l-8 35" stroke="#f4b7cc" strokeWidth="10" strokeLinecap="round"/><ellipse cx="91" cy="93" rx="62" ry="47" fill="#fff7ed" stroke="#785987" strokeWidth="4"/><ellipse cx="64" cy="86" rx="4" ry="6" fill="#654969"/><ellipse cx="116" cy="86" rx="4" ry="6" fill="#654969"/><ellipse cx="51" cy="100" rx="10" ry="6" fill="#f8c0cd"/><ellipse cx="129" cy="100" rx="10" ry="6" fill="#f8c0cd"/><path d="M83 98q8 10 16 0m-8-1v-5" fill="none" stroke="#785987" strokeWidth="3" strokeLinecap="round"/><path d="M57 116l34 6 34-6v29l-34 5-34-5z" fill="#bbdcca" stroke="#785987" strokeWidth="3"/><path d="M91 123v26" stroke="#785987" strokeWidth="3"/><path d="M25 45l3-8 3 8 8 3-8 3-3 8-3-8-8-3z" fill="#e7b54e"/><path d="M155 107l3-6 3 6 6 3-6 3-3 6-3-6-6-3z" fill="#e7b54e"/></svg>;}
