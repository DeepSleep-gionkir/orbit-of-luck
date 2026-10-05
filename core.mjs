export const TOTAL_WEIGHT=1_000_000;
export const RARITIES=[
 ['평범',420000,'#b9c8df','COMMON'],['흔치 않은',260000,'#acdcbf','UNCOMMON'],
 ['정교',150000,'#86e3db','REFINED'],['희귀',80000,'#82c7ff','RARE'],
 ['특별',50000,'#a7b6ff','SPECIAL'],['영웅',20000,'#c2a3ff','EPIC'],
 ['유일',10000,'#e8adff','UNIQUE'],['전설',5000,'#ffdc94','LEGENDARY'],
 ['신화',3000,'#ffb18b','MYTHIC'],['초월',1000,'#ff9bcb','TRANSCENDENT'],
 ['천상',600,'#b8ebff','CELESTIAL'],['성운',250,'#c7b4ff','NEBULA'],
 ['불멸',100,'#ffa3af','IMMORTAL'],['영원',30,'#ffe9b8','ETERNAL'],
 ['태초',12,'#a4ffe1','PRIMORDIAL'],['절대',5,'#fff0cb','ABSOLUTE'],
 ['무한',2,'#e3c5ff','INFINITE'],['기적',1,'#fff8dd','MIRACLE'],
].map(([name,weight,color,label],index)=>Object.freeze({name,weight,color,label,index}));
if(RARITIES.reduce((n,r)=>n+r.weight,0)!==TOTAL_WEIGHT)throw new Error('확률 합계 오류');
export const percent=r=>`${Number((r.weight/10000).toFixed(4))}%`;
export const chance=r=>`약 ${Math.round(TOTAL_WEIGHT/r.weight).toLocaleString('ko-KR')}분의 1`;
export function rarityFromTicket(ticket){
 if(!Number.isInteger(ticket)||ticket<0||ticket>=TOTAL_WEIGHT)throw new RangeError('잘못된 추첨값');
 let edge=0;for(const r of RARITIES){edge+=r.weight;if(ticket<edge)return r;}
}
export function randomRarity(source=globalThis.crypto){
 const n=new Uint32Array(1),ceiling=Math.floor(2**32/TOTAL_WEIGHT)*TOTAL_WEIGHT;
 do{source.getRandomValues(n);}while(n[0]>=ceiling);return rarityFromTicket(n[0]%TOTAL_WEIGHT);
}
export function validRecords(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.records))return [];
 const ids=new Set();return raw.records.filter(r=>r&&typeof r.id==='string'&&r.id.length<150&&!ids.has(r.id)&&ids.add(r.id)&&Number.isInteger(r.rarity)&&r.rarity>=0&&r.rarity<RARITIES.length&&Number.isFinite(r.timestamp)&&r.timestamp>=0&&r.timestamp<=8.64e15).sort((a,b)=>b.timestamp-a.timestamp);
}
export function dateValue(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function parseLocalDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('날짜를 선택해주세요.');
 const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);if(dateValue(date)!==value)throw new Error('올바른 날짜를 선택해주세요.');return date;
}
export function filterRecords(records,period,start,end,now=new Date()){
 if(period==='all')return records;let from,to;
 if(period==='today'||period==='week'){from=new Date(now.getFullYear(),now.getMonth(),now.getDate());if(period==='week')from.setDate(from.getDate()-6);to=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);}
 else if(period==='custom'){from=parseLocalDate(start);to=parseLocalDate(end);if(from>to)throw new Error('종료일은 시작일과 같거나 이후여야 해요.');to.setDate(to.getDate()+1);}
 else throw new Error('올바른 기간을 선택해주세요.');
 return records.filter(r=>r.timestamp>=from.getTime()&&r.timestamp<to.getTime());
}
