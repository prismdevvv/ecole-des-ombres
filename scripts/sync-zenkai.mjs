const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Configure les secrets SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.');
const rows=[];
for(let page=1,pages=1;page<=pages;page++){
 const r=await fetch(`https://db.builtbyloris.dev/api/characters?hidden=all&limit=500&page=${page}`,{signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`Zenkai : ${r.status}`);
 const body=await r.json();
 if(!body.success||!Array.isArray(body.data))throw Error('Réponse Zenkai invalide.');
 pages=Number(body.pages)||1;
 for(const c of body.data){if(!c.charKey||!c.name)continue;rows.push({char_key:c.charKey,discord_id:c.discordId?String(c.discordId):null,name:c.name,last_played_at:c.lastPlayedAt||null,divisions:c.divisions||[]});}
}
for(let i=0;i<rows.length;i+=250){
 const r=await fetch(`${url}/rest/v1/zenkai_characters?on_conflict=char_key`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+250)),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`Supabase : ${r.status}`);
}
// Expire the voice signalling data, which is only useful briefly.
const cleaned=await fetch(`${url}/rest/v1/rtc_messages?created_at=lt.${encodeURIComponent(new Date(Date.now()-3600000).toISOString())}`,{method:'DELETE',headers:{apikey:key,Authorization:`Bearer ${key}`}});
if(!cleaned.ok)throw Error(`Nettoyage vocal : ${cleaned.status}`);
console.log(`${rows.length} personnages synchronisés.`);
