import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Content-Type":"application/json"};
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return json(405,{error:"Méthode refusée."});
 try{
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer /,"");
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(401,{error:"Reconnecte-toi avec Discord."});
 const identity=user.identities?.find(i=>i.provider==="discord");
 const discordId=identity?.identity_data?.provider_id || identity?.identity_data?.sub || identity?.id;
 if(!discordId||!/^\d{17,20}$/.test(discordId))return json(403,{error:"Identité Discord requise."});
 const b=await req.json();
 const {data:characters,error:ce}=await db.from("zenkai_characters").select("char_key,name").eq("discord_id",discordId).order("last_played_at",{ascending:false,nullsFirst:false});
 if(ce)throw ce;
 if(!characters?.length)return json(403,{error:"Aucun personnage associé à ton Discord. Demande la synchronisation Zenkai à l'administrateur."});
 if(b.path==="characters")return json(200,{characters});
 for(let retry=0;retry<6;retry++){
 const {data:row,error:readError}=await db.from("school_state").select("data,version").eq("id",1).single();
 if(readError)throw readError;
 let D=structuredClone(row.data);
 const rid=()=>crypto.randomUUID();
const ROLES=["Roi","Tour","Fou","Général d'or","Général d'argent","Cavalier","Lance","Pion"],HIGH=["Roi","Tour"];
const str=(s,n)=>String(s||"").trim().slice(0,n);
const sq=i=>(9-i%9)+"abcdefghi"[Math.floor(i/9)];
const keyOf=n=>String(n).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();
const start=()=>{const e=Array(81).fill("");"lnsgkgsnl".split("").forEach((c,i)=>{e[i]=c;e[72+i]=c.toUpperCase()});for(let i=0;i<9;i++){e[18+i]="p";e[54+i]="P"}e[10]="r";e[16]="b";e[64]="B";e[70]="R";return e};
const newGame=(s,g)=>({id:rid(),cells:start(),last:[-1,-1],turn:"S",sente:s||null,gote:g||null,hs:"",hg:"",log:[],over:false,winner:null});
if(!D.game)D.game=newGame();
const state=u=>({me:u&&{name:u.name,role:u.role,done:u.done||[],code:u.code||""},annonce:D.annonce||null,exos:D.exercices||[],users:Object.values(D.users).map(x=>({name:x.name,role:x.role,code:x.code||""})),cours:D.cours,rapports:D.rapports,parties:D.parties.slice(-500),game:D.game});
const own=(u,x)=>x&&(x.author===u.name||x.nom===u.name||HIGH.includes(u.role));
const needHigh=u=>{if(!HIGH.includes(u.role))throw Error("Action réservée aux hauts gradés.")};
const act={
 "cours.add":(u,b)=>{const t=str(b.title,80),body=str(b.body,5000);if(!t||!body)throw Error("Titre et contenu requis.");D.cours.push({id:rid(),kind:b.kind==="planifie"?"planifie":"cours",title:t,date:str(b.date,10),prof:str(b.prof,60),body,author:u.name,role:u.role,inscrits:[],ts:Date.now()})},
 "cours.del":(u,b)=>{const c=D.cours.find(x=>x.id===b.id);if(own(u,c))D.cours=D.cours.filter(x=>x!==c)},
 "cours.join":(u,b)=>{const c=D.cours.find(x=>x.id===b.id);if(!c)return;const i=c.inscrits.indexOf(u.name);i<0?c.inscrits.push(u.name):c.inscrits.splice(i,1)},
 "rap.add":(u,b)=>{const t=str(b.text,8000);if(!t)throw Error("Le rapport est vide.");D.rapports.push({id:rid(),nom:u.name,code:u.code||"",date:str(b.date,10),text:t,cible:["Konoha","Suna","Autre"].includes(b.cible)?b.cible:"Autre",fiab:["Confirmé","Probable","Rumeur"].includes(b.fiab)?b.fiab:"Rumeur",role:u.role,status:"attente",by:null,note:"",ts:Date.now()})},
 "rap.rev":(u,b)=>{needHigh(u);const r=D.rapports.find(x=>x.id===b.id);if(r&&["validé","rejeté"].includes(b.status)){r.status=b.status;r.by=u.name+" ("+u.role+")";r.note=str(b.note,300)}},
 "rap.del":(u,b)=>{const r=D.rapports.find(x=>x.id===b.id);if(own(u,r))D.rapports=D.rapports.filter(x=>x!==r)},
 "role.set":(u,b)=>{needHigh(u);const t=Object.values(D.users).find(x=>x.name===b.name);if(!t||!ROLES.includes(b.role))return;if(u.role!=="Roi"&&(HIGH.includes(t.role)||HIGH.includes(b.role)))throw Error("Seul le Roi peut nommer ou modifier la Tour et le Roi.");if(t.role==="Roi"&&b.role!=="Roi"&&Object.values(D.users).filter(x=>x.role==="Roi").length<2)throw Error("Il doit rester au moins un Roi.");t.role=b.role},
 "ex.toggle":(u,b)=>{const id=str(b.id,80);if(!id)return;u.done=u.done||[];const i=u.done.indexOf(id);if(i<0){if(u.done.length<100)u.done.push(id)}else u.done.splice(i,1)},
 "exo.add":(u,b)=>{needHigh(u);const t=str(b.text,300);if(!t||!["oratoire","manip","info","conseils"].includes(b.disc))throw Error("Choisis une discipline et écris la consigne.");D.exercices=D.exercices||[];D.exercices.push({id:"x"+rid(),disc:b.disc,text:t,due:str(b.due,10),author:u.name,ts:Date.now()})},
 "exo.del":(u,b)=>{needHigh(u);D.exercices=(D.exercices||[]).filter(x=>x.id!==b.id)},
 "code.set":(u,b)=>{u.code=str(b.code,30).replace(/[<>]/g,"")},
 "annonce.set":(u,b)=>{needHigh(u);const t=str(b.text,600);D.annonce=t?{text:t,by:u.name+" ("+u.role+")",ts:Date.now()}:null},
 sit:(u,b)=>{const g=D.game,k=b.side==="S"?"sente":"gote",o=k==="sente"?"gote":"sente";if(g[k])throw Error("Place déjà prise.");if(g[o]===u.name)throw Error("Tu ne peux pas jouer contre toi-même.");g[k]=u.name},
 stand:(u)=>{const g=D.game;if(g.sente===u.name)g.sente=null;if(g.gote===u.name)g.gote=null},
 reset:(u)=>{const g=D.game;if(!(g.over&&[g.sente,g.gote].includes(u.name))&&!HIGH.includes(u.role))throw Error("Une nouvelle partie est possible une fois la partie terminée.");D.game=newGame(g.sente,g.gote)},
 move:(u,b)=>{const g=D.game;if(g.over)throw Error("Partie terminée.");if((g.turn==="S"?g.sente:g.gote)!==u.name)throw Error("Ce n'est pas ton tour.");
  const f=b.from,t=b.to;if(!Number.isInteger(f)||!Number.isInteger(t)||f<0||t<0||f>80||t>80||f===t)return;
  const m=g.cells[f],x=g.cells[t];if(!m||(m===m.toUpperCase())!==(g.turn==="S"))throw Error("Choisis une de tes pièces.");
  if(x&&(x===x.toUpperCase())===(m===m.toUpperCase()))throw Error("Case occupée par ta pièce.");
  g.cells[t]=m;g.cells[f]="";g.last=[f,t];g.log=(g.log||[]).concat(sq(f)+(x?"x":"-")+sq(t)).slice(-60);
  if(x){if(x.toLowerCase()==="k"){g.over=true;g.winner=g.turn;D.parties.push({id:g.id,sente:g.sente,gote:g.gote,winner:g.turn,ts:Date.now()})}else if(g.turn==="S")g.hs+=x.toUpperCase();else g.hg+=x.toLowerCase()}
  if(!g.over)g.turn=g.turn==="S"?"G":"S"}
};

 const key=discordId;
 let u=D.users[key];
 let dirty=false;
 if(!u){
   const selected=characters.find(c=>c.char_key===b.character)|| (characters.length===1?characters[0]:null);
   if(!selected)return json(409,{error:"Choisis ton personnage.",characters});
   if(Object.values(D.users).some(x=>x.name===selected.name))return json(409,{error:"Ce nom de personnage est déjà utilisé. Contacte l'administrateur."});
   u=D.users[key]={name:selected.name,character:selected.char_key,role:"Pion",done:[],code:""};dirty=true;
 }
 if(!characters.some(c=>c.char_key===u.character))return json(403,{error:"Le personnage lié ne correspond plus à ton Discord. Contacte l'administrateur."});
 const cursor=new Date().toISOString();
 if(b.path==="rtc"){
   if(JSON.stringify(b.data).length>16000)throw Error("Signal trop volumineux.");
   const {error}=await db.from("rtc_messages").insert({sender:discordId,name:u.name,data:b.data});if(error)throw error;
   return json(200,{});
 }
 let out={};
 if(b.path==="action"){
   if(!Object.hasOwn(act,b.type))throw Error("Action inconnue.");
   out=act[b.type](u,b)||{};dirty=true;
 }else if(!["me","state"].includes(b.path))return json(404,{error:"Action inconnue."});
 if(dirty){
   const {data:written,error}=await db.from("school_state").update({data:D,version:row.version+1}).eq("id",1).eq("version",row.version).select("version");
   if(error)throw error;if(!written.length)continue;
 }
 if(b.path==="action")return json(200,out);
 let messages=[];
 if(b.since){const since=new Date(b.since);if(!Number.isNaN(+since)){
   const {data,error}=await db.from("rtc_messages").select("name,data").neq("sender",discordId).gt("created_at",new Date(Math.max(+since,Date.now()-60000)).toISOString()).lte("created_at",cursor).order("created_at").limit(100);
   if(error)throw error;messages=(data||[]).map(m=>({from:m.name,data:m.data}));
 }}
 return json(200,{...state(u),messages,cursor});
 }
 return json(409,{error:"Le site est occupé. Réessaie."});
 }catch(e){console.error(e);return json(400,{error:e instanceof Error?e.message:"Erreur de base de données."});}
});
