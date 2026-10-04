import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {initialState,startSession,recordAnswer,grade,normalize} from '../lib/practice.ts';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url),'utf8'));
assert.equal(bank.length,483);assert.equal(new Set(bank.map(q=>q.id)).size,483);
for(const q of bank){for(const p of [...q.images,...q.originalImages,...q.analysisImages])assert.ok(existsSync(new URL('../public'+p,import.meta.url)),p);if(!q.ungraded)assert.equal(grade(q,Array.isArray(q.canonical)?q.canonical.join(''):q.answer),true,q.id);}
let state=initialState('Test');const q=bank[0];const wrong=q.answer==='A'?'B':'A';
const attempt=(a)=>{startSession(state,[q],'order',0);recordAnswer(state,q,a);};
attempt(wrong);assert.equal(state.wrong[q.id].streak,0);attempt(q.answer);attempt(q.answer);assert.equal(state.wrong[q.id].streak,2);attempt(wrong);assert.equal(state.wrong[q.id].streak,0);attempt(q.answer);attempt(q.answer);attempt(q.answer);assert.equal(state.wrong[q.id],undefined);assert.equal(state.total,7);assert.equal(state.correct,5);
const total=state.total;assert.throws(()=>recordAnswer(state,q,q.answer));assert.equal(state.total,total);
startSession(state,bank,'random',0);assert.equal(new Set(state.session.queue).size,483);assert.equal(state.session.queue.length,483);
startSession(state,bank,'order',3);assert.equal(state.session.queue.length,95);assert.equal(state.session.queue[0],'c3-001');
startSession(state,bank,'wrong',0);assert.equal(state.session.queue.length,0);
const ungraded=bank.find(q=>q.ungraded);startSession(state,[ungraded],'order',0);recordAnswer(state,ungraded,'True');assert.equal(state.total,total);
assert.equal(normalize('[“car”, “truck”, “bus”]'),normalize("['car','truck','bus']"));assert.notEqual(normalize("'a b'"),normalize("'ab'"));
console.log('PASS: 483 source records/assets; answer grading; streak reset/removal; duplicate prevention; random/order filters; ungraded exclusions.');
