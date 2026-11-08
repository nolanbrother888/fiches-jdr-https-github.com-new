
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, FieldPath, writeBatch } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config.js";
const fs={doc,collection,onSnapshot,setDoc,updateDoc,deleteDoc,getDoc,FieldPath,writeBatch};
(function(){
"use strict";
// ---------- Règles ----------
const ABS=[["for","Force"],["dex","Dextérité"],["con","Constitution"],["int","Intelligence"],["sag","Sagesse"],["cha","Charisme"]];
const ABN=Object.fromEntries(ABS);
const SKILLS=[["acrobaties","Acrobaties","dex"],["arcanes","Arcanes","int"],["athletisme","Athlétisme","for"],["discretion","Discrétion","dex"],["dressage","Dressage","sag"],["escamotage","Escamotage","dex"],["histoire","Histoire","int"],["intimidation","Intimidation","cha"],["intuition","Intuition","sag"],["investigation","Investigation","int"],["medecine","Médecine","sag"],["nature","Nature","int"],["perception","Perception","sag"],["persuasion","Persuasion","cha"],["religion","Religion","int"],["representation","Représentation","cha"],["survie","Survie","sag"],["tromperie","Tromperie","cha"]];
const CLASSES=["Artificier","Barbare","Barde","Clerc","Druide","Ensorceleur","Guerrier","Magicien","Moine","Occultiste","Paladin","Rôdeur","Roublard"];
const ARMORS={"Aucune":10,"Légère":25,"Moyenne":50,"Lourde":75};
const RES=[["physique","Physique"],["magique","Magique"],["feu","Feu"],["froid","Froid"],["foudre","Foudre"],["poison","Poison"],["necrotique","Nécrotique"],["radiant","Radiant"],["acide","Acide"],["tonnerre","Tonnerre"],["psychique","Psychique"],["force","Force"]];
const ETATS=["Agrippé","À terre","Assourdi","Aveuglé","Charmé","Effrayé","Empoisonné","Entravé","Étourdi","Inconscient","Invisible","Neutralisé","Paralysé","Pétrifié","Concentration"];
const CATS=["Équipé magique","Équipé non magique","Sac","Potions","Bouffe","Objets précieux","Objets pour créations","Objets de quête"];
const ECOLES=["Abjuration","Divination","Enchantement","Évocation","Illusion","Invocation","Nécromancie","Transmutation"];
const RARETES=["Commun","Peu commun","Rare","Très rare","Légendaire","Artefact"];
const COLORS=["#7bd88f","#6cb6ff","#b48cff","#f0a35e","#e5645c","#f2d16b","#5fd3c8","#e88ad0","#c0c0c0"];
const TABS=[["id","Identité","🪪"],["car","Caracs","🎲"],["comp","Compét.","📜"],["combat","Combat","⚔️"],["sorts","Sorts","✨"],["inv","Inventaire","🎒"],["dons","Dons","⭐"],["perso","Perso","🧩"],["notes","Notes","📝"]];
const HTABS=[["persos","Persos","🧙"],["mj","Vue MJ","👁️"],["biblio","Biblio","📚"],["commun","Commun","💰"],["planning","Planning","📅"],["journal","Journal","📖"]];
const DISPO=["","oui","peut","non"];const DLAB={"":"?","oui":"Oui","peut":"Peut-être","non":"Non"};

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{const n=parseFloat(v);return isNaN(n)?0:n};
const mod=v=>Math.floor((num(v)-10)/2);
const sg=n=>(n>=0?"+":"")+n;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=o=>JSON.parse(JSON.stringify(o));
const today=()=>new Date().toISOString().slice(0,10);
const fdate=d=>{if(!d)return"Date à fixer";try{const t=new Date(d+"T12:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});return t.charAt(0).toUpperCase()+t.slice(1)}catch(e){return d}};

function blank(){
  return {id:uid(),ownerId:myId||"",nom:"Nouveau perso",joueur:"",race:"",classes:[{nom:"",sous:"",niv:1}],historique:"",alignement:"",divinite:"",xp:0,avatar:"",couleur:COLORS[Math.floor(Math.random()*COLORS.length)],
    car:{for:10,dex:10,con:10,int:10,sag:10,cha:10},sauv:{},maitriseAuto:true,maitrise:2,comp:{},compBonus:{},inspiration:0,
    pv:{act:10,max:10,temp:0},ca:10,initBonus:0,vitesse:9,desVie:"",dsSucc:0,dsEch:0,tombe0:0,morts:0,armure:"Aucune",res:{},etats:[],epuisement:0,attaques:[],
    sortCar:"int",slots:Array.from({length:9},()=>({max:0,used:0})),pacte:{niv:1,max:0,used:0},sorts:[],ressources:[],
    monnaie:{pc:0,pa:0,pe:0,po:0,pp:0},monnaieCustom:[],maxMagEquip:4,items:[],dons:[],histoire:"",notes:"",custom:[],retire:false,updated:Date.now()};
}
function normPerso(c){const b=blank();for(const k in b){if(c[k]===undefined)c[k]=b[k]}if(!Array.isArray(c.slots)||c.slots.length<9)c.slots=b.slots;return c}
const level=c=>Math.max(1,c.classes.reduce((a,x)=>a+num(x.niv),0));
const prof=c=>c.maitriseAuto?2+Math.floor((level(c)-1)/4):num(c.maitrise);
const skillTot=(c,k,a)=>mod(c.car[a])+prof(c)*num(c.comp[k]||0)+num(c.compBonus[k]||0);
const saveTot=(c,a)=>mod(c.car[a])+(c.sauv[a]?prof(c):0);
const classLine=c=>c.classes.filter(x=>x.nom).map(x=>x.nom+" "+x.niv).join(" / ")||"Sans classe";

// ---------- Stockage partagé (Firebase) ----------
const COLS=["persos","biblio","sessions","courses","commun"];
const S={};COLS.forEach(c=>S[c]=new Map());
const GDEF=()=>({journal:{texte:""},commun:{monnaie:{pp:0,po:0,pe:0,pa:0,pc:0}},planning:{joueurs:[]}});
let G=GDEF();
let remote=null,myId=null,me=null,readOnly=false,saveStatus="Connexion…";
const USERS=new Map();
let state={view:"home",home:"persos",cur:null,tab:"id",bibType:"sort",bibQ:"",bibNiv:"",persoFilter:"actifs",showPast:false};
const LS=()=>"fichesJDR.fb."+(myId||"anon");
let firstPersos=false;
function lsLoad(){try{const r=JSON.parse(localStorage.getItem(LS())||"null");if(r){COLS.forEach(c=>(r.S&&r.S[c]||[]).forEach(o=>S[c].set(o.id,c==="persos"?normPerso(o):o)));G=Object.assign(GDEF(),r.G||{})}}catch(e){}}
function lsSave(){try{const o={S:{},G};COLS.forEach(c=>o.S[c]=[...S[c].values()]);localStorage.setItem(LS(),JSON.stringify(o))}catch(e){}}
const tm={},q={},busy={},lastEdit={};
const keyOf=(col,id)=>col+"/"+id;
function busyKey(k){return tm[k]||busy[k]||(q[k]&&q[k].length)||(Date.now()-(lastEdit[k]||0)<2500)}
function enqueue(k,fn){(q[k]=q[k]||[]).push(fn);run(k)}
async function run(k){if(busy[k])return;busy[k]=true;while(q[k]&&q[k].length){const fn=q[k].shift();try{await fn();setStatus("Synchronisé ✓")}catch(e){handleErr(e)}}busy[k]=false}
function handleErr(e){const c=e&&e.code;
  if(c==="permission-denied")toast("Modification refusée : ce n'est pas ta fiche");
  else if(c==="resource-exhausted")toast("Limite Firebase atteinte pour aujourd'hui");
  else setStatus("Hors ligne, enregistré sur l'appareil")}
const getObj=(col,id)=>col==="groupe"?G[id]:S[col].get(id);
const ref=(col,id)=>fs.doc(remote.db,col,id);
function save(col,id,now){
  const k=keyOf(col,id);lastEdit[k]=Date.now();const o=getObj(col,id);if(o&&col==="persos")o.updated=Date.now();lsSave();
  if(!remote)return;
  setStatus("Enregistrement…");clearTimeout(tm[k]);
  const go=()=>{tm[k]=null;const d=getObj(col,id);if(!d)return;const body=clone(d);enqueue(k,()=>fs.setDoc(ref(col,id),body))};
  if(now)go();else tm[k]=setTimeout(go,700);
}
function upd(col,id,field,sub,val){const k=keyOf(col,id);lastEdit[k]=Date.now();lsSave();if(!remote)return;enqueue(k,()=>fs.updateDoc(ref(col,id),new fs.FieldPath(field,sub),val))}
function del(col,id){const k=keyOf(col,id);S[col].delete(id);clearTimeout(tm[k]);tm[k]=null;lastEdit[k]=Date.now();lsSave();if(remote)enqueue(k,()=>fs.deleteDoc(ref(col,id)))}
function setStatus(s){saveStatus=s;const el=document.getElementById("st");if(el)el.textContent=s}

function subscribe(){
  const db=remote.db;const synced={};
  COLS.forEach(col=>{
    fs.onSnapshot(fs.collection(db,col),snap=>{
      let ch=false;
      snap.docChanges().forEach(x=>{const id=x.doc.id;if(busyKey(keyOf(col,id)))return;
        if(x.type==="removed")S[col].delete(id);else{const o=clone(x.doc.data());o.id=id;S[col].set(id,col==="persos"?normPerso(o):o)}ch=true});
      if(!snap.metadata.fromCache&&!synced[col]){synced[col]=true;setStatus("Synchronisé ✓");
        const ids=new Set(snap.docs.map(d=>d.id));
        [...S[col].keys()].forEach(id=>{if(!ids.has(id)&&!busyKey(keyOf(col,id))){S[col].delete(id);ch=true}});
        if(col==="persos"){firstPersos=true;ch=true}}
      if(ch){lsSave();softRender()}
    },()=>setStatus("Hors ligne, enregistré sur l'appareil"));
  });
  ["journal","commun","planning"].forEach(k=>{
    fs.onSnapshot(ref("groupe",k),snap=>{if(busyKey(keyOf("groupe",k)))return;if(snap.exists()){G[k]=Object.assign(GDEF()[k],clone(snap.data()));lsSave();softRender()}},()=>{});
  });
  fs.onSnapshot(fs.collection(db,"users"),snap=>{snap.docs.forEach(d=>USERS.set(d.id,d.data().nom||""));softRender()},()=>{});
}
const ownerName=c=>c.ownerId?(c.ownerId===myId?"toi":(USERS.get(c.ownerId)||"un joueur")):"";

// Import des données de départ (tableur), une seule fois quand la base est vide
async function importSeed(){
  try{
    const r=await fetch("seed.json");const seed=await r.json();
    let batch=fs.writeBatch(remote.db),n=0;
    const push=async(col,id,data)=>{batch.set(ref(col,id),data);n++;if(n%400===0){await batch.commit();batch=fs.writeBatch(remote.db)}};
    for(const col of COLS)for(const o of (seed[col]||[])){const d=clone(o);if(col==="persos")d.ownerId="";await push(col,o.id,d)}
    for(const k of Object.keys(seed.groupe||{}))await push("groupe",k,seed.groupe[k]);
    await batch.commit();toast("Données du groupe importées");
  }catch(e){toast("Import impossible : "+(e.code||e.message))}
}

// ---------- Helpers UI ----------
const cur=()=>S.persos.get(state.cur);
const canEdit=c=>!readOnly&&!!c&&(!myId||!c.ownerId||c.ownerId===myId);
function getP(o,p){return p.split(".").reduce((a,k)=>a==null?a:a[k],o)}
function setP(o,p,v){const ks=p.split(".");let a=o;for(let i=0;i<ks.length-1;i++){if(a[ks[i]]==null)a[ks[i]]={};a=a[ks[i]]}a[ks[ks.length-1]]=v}
function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
function modal(html){const m=document.createElement("div");m.className="modal";m.innerHTML='<div class="box">'+html+'</div>';m.addEventListener("click",e=>{if(e.target===m)m.remove()});document.body.appendChild(m);return m}
function confirmBox(msg,ok,label){const m=modal('<h2>Confirmer</h2><p>'+esc(msg)+'</p><div class="acts"><button class="btn" data-x>Annuler</button><button class="btn" data-ok style="background:var(--bad);border-color:var(--bad);color:#fff">'+(label||"Supprimer")+'</button></div>');
  m.querySelector("[data-x]").onclick=()=>m.remove();m.querySelector("[data-ok]").onclick=()=>{m.remove();ok()}}
const F=(lbl,k,c,type,extra)=>'<div><label class="f">'+lbl+'</label><input data-k="'+k+'" type="'+(type||"text")+'" value="'+esc(getP(c,k))+'" '+(extra||"")+'></div>';
const GF=(lbl,gk,val,type,extra)=>'<div><label class="f">'+lbl+'</label><input data-gk="'+gk+'" type="'+(type||"text")+'" value="'+esc(val)+'" '+(extra||"")+'></div>';
const barColor=p=>p>.5?"var(--acc)":p>.25?"var(--warn)":"var(--bad)";
const abColor=v=>v>=18?"var(--violet)":v>=14?"var(--acc)":v>=10?"var(--blue)":"var(--bad)";
const avatar=(c,sz)=>'<div class="av" style="'+(sz?'width:'+sz+'px;height:'+sz+'px;font-size:'+Math.round(sz*.4)+'px;':'')+'border-color:'+c.couleur+';'+(c.avatar?'background-image:url('+c.avatar+')':'')+'">'+(c.avatar?"":esc((c.nom||"?")[0]))+'</div>';
const persos=()=>[...S.persos.values()].sort((a,b)=>String(a.nom).localeCompare(String(b.nom)));
let pendingRender=false;
function softRender(){const a=document.activeElement;if(a&&app.contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)){pendingRender=true;return}const y=window.scrollY;render();window.scrollTo(0,y)}

// ---------- Rendu ----------
const app=document.getElementById("app");
const roBanner=()=>readOnly?'<div class="ro">👀 Lecture seule.</div>':'';
function render(){
  if(state.view==="sheet"){const c=cur();if(!c){state.view="home";return render()}
    app.innerHTML='<div class="top"><div class="wrap"><button class="ico" data-act="back">‹</button>'+avatar(c,36)+'<h1 data-d="title">'+esc(c.nom)+'</h1><span class="status" id="st">'+esc(saveStatus)+'</span></div></div>'+
      '<div class="wrap">'+roBanner()+(!readOnly&&!canEdit(c)?'<div class="ro">🔒 Fiche d\'un autre joueur : lecture seule.</div>':'')+(!readOnly&&!c.ownerId&&myId?'<div class="ro" style="border-color:var(--acc);color:var(--acc);background:#1f3326">Cette fiche n\'a pas encore de propriétaire. <button class="btn sm" data-act="mine" style="margin-left:6px">C\'est mon perso</button></div>':'')+'<div id="pane">'+pane(c)+'</div></div>'+
      '<nav class="tabs"><div class="in">'+TABS.map(t=>'<button data-tab="'+t[0]+'" class="'+(state.tab===t[0]?"on":"")+'"><b>'+t[2]+'</b>'+t[1]+'</button>').join("")+'</div></nav>';
    derive();lockRO();return}
  const title={persos:"⚔️ Fiches JDR",mj:"👁️ Vue MJ",biblio:"📚 Bibliothèque",commun:"💰 Inventaire commun",planning:"📅 Planning",journal:"📖 Journal"}[state.home];
  app.innerHTML='<div class="top"><div class="wrap"><h1>'+title+'</h1><span class="status" id="st">'+esc(saveStatus)+'</span>'+(state.home==="persos"?'<button class="ico" data-act="io" title="Importer / exporter">⇅</button><button class="ico" data-act="logout" title="Se déconnecter">⎋</button>':'')+'</div></div>'+
    '<div class="wrap">'+roBanner()+'<div id="hpane">'+homePane()+'</div></div>'+
    '<nav class="tabs"><div class="in">'+HTABS.map(t=>'<button data-htab="'+t[0]+'" class="'+(state.home===t[0]?"on":"")+'"><b>'+t[2]+'</b>'+t[1]+'</button>').join("")+'</div></nav>';
  lockRO();
}
function lockRO(){if(state.view==="sheet"&&!canEdit(cur())){app.querySelectorAll("#pane input,#pane select,#pane textarea,#pane button:not([data-tab])").forEach(e=>e.disabled=true);return}if(!readOnly)return;app.querySelectorAll("#pane input,#pane select,#pane textarea,#hpane input,#hpane select,#hpane textarea").forEach(e=>{if(e.id!=="bibq"&&e.id!=="bibniv")e.disabled=true})}

function nextAllDate(){const pl=G.planning.joueurs.filter(Boolean);if(!pl.length)return null;
  return [...S.sessions.values()].filter(s=>s.date&&s.date>=today()&&pl.every(p=>(s.dispo||{})[p]==="oui")).sort((a,b)=>a.date.localeCompare(b.date))[0]||null}

function homePane(){
  switch(state.home){
  case "persos":{const all=persos();const list=all.filter(c=>state.persoFilter==="tous"?true:state.persoFilter==="retires"?c.retire:!c.retire);
    const mine=list.filter(c=>myId&&c.ownerId===myId),others=list.filter(c=>!(myId&&c.ownerId===myId));
    const nx=nextAllDate();
    const card=c=>{const p=c.pv.max?clamp(c.pv.act/c.pv.max,0,1):0;return '<button class="ch" data-open="'+c.id+'" style="--c:'+c.couleur+'">'+avatar(c)+
      '<div style="flex:1;min-width:0"><div class="n">'+esc(c.nom)+(c.retire?' <span class="tag">retiré</span>':'')+'</div>'+(ownerName(c)?'<div class="owner">Joué par '+esc(ownerName(c))+'</div>':'')+'<div class="mute small">'+esc(classLine(c))+' · niv. '+level(c)+(c.joueur?' · '+esc(c.joueur):'')+'</div>'+
      '<div class="mini"><i style="width:'+(p*100)+'%;background:'+barColor(p)+'"></i></div><div class="small mute" style="margin-top:3px">PV '+c.pv.act+'/'+c.pv.max+' · CA '+c.ca+(c.etats.length?' · <span style="color:var(--warn)">'+esc(c.etats.join(", "))+'</span>':'')+'</div></div></button>'};
    return (nx?'<button class="card nextses" data-htab="planning">📅 Prochaine session où tout le monde est dispo : <b>'+esc(fdate(nx.date))+'</b></button>':'')+
      '<div class="seg">'+[["actifs","Actifs"],["retires","Retirés"],["tous","Tous"]].map(([k,l])=>'<button data-pf="'+k+'" class="'+(state.persoFilter===k?"on":"")+'">'+l+'</button>').join("")+'</div>'+
      (list.length?((mine.length?'<div class="catt">Mes personnages</div><div class="chars">'+mine.map(card).join("")+'</div>':'')+
        (others.length?'<div class="catt">'+(mine.length?'Le reste du groupe':'Le groupe')+'</div><div class="chars">'+others.map(card).join("")+'</div>':''))
       :'<div class="empty"><div class="big1">🐉</div><h2>Aucun personnage ici</h2><p>Crée ta fiche, elle sera visible par tout le groupe.</p>'+(firstPersos&&!S.persos.size?'<button class="btn pri" data-act="seed" style="margin-top:10px">Importer les persos du tableur</button>':'')+'</div>')+
      (readOnly?'':'<button class="btn pri" data-act="new" style="width:100%;margin-top:14px;padding:13px">+ Nouveau personnage</button>');}

  case "mj":{const list=persos().filter(c=>!c.retire);
    if(!list.length)return '<div class="empty"><div class="big1">👁️</div><p>Aucun personnage actif.</p></div>';
    return '<div class="hint" style="margin:0 0 10px">Vue d\'ensemble du groupe, en lecture seule. Chaque joueur gère ses PV dans sa fiche.</div>'+list.map(c=>{const p=c.pv.max?clamp(c.pv.act/c.pv.max,0,1):0;
      const sl=c.slots.map((s,i)=>num(s.max)?'<span class="sl">'+(i+1)+' : '+Math.max(0,num(s.max)-num(s.used))+'/'+num(s.max)+'</span>':'').join("")+(num(c.pacte.max)?'<span class="sl">Pacte : '+Math.max(0,num(c.pacte.max)-num(c.pacte.used))+'/'+num(c.pacte.max)+'</span>':'');
      return '<div class="card mjc" style="border-left:5px solid '+c.couleur+'"><div class="row" style="gap:10px">'+avatar(c,44)+'<div style="flex:1;min-width:0"><button class="lnk" data-open="'+c.id+'">'+esc(c.nom)+'</button><div class="small mute">'+esc(classLine(c))+(c.joueur?' · '+esc(c.joueur):'')+'</div></div></div>'+
        '<div class="bar" style="margin-top:10px;height:20px"><i style="width:'+(p*100)+'%;background:'+barColor(p)+'"></i><div class="t">'+c.pv.act+' / '+c.pv.max+(num(c.pv.temp)?' (+'+c.pv.temp+')':'')+'</div></div>'+
        '<div class="stats4"><div><small>CA</small><b>'+c.ca+'</b></div><div><small>Init</small><b>'+sg(mod(c.car.dex)+num(c.initBonus))+'</b></div><div><small>Perc. pass.</small><b>'+(10+skillTot(c,"perception","sag"))+'</b></div><div><small>DD sorts</small><b>'+(8+prof(c)+mod(c.car[c.sortCar]))+'</b></div></div>'+
        (c.etats.length||c.epuisement?'<div class="chips" style="margin-top:8px">'+c.etats.map(e=>'<span class="chip on">'+esc(e)+'</span>').join("")+(c.epuisement?'<span class="chip on" style="background:var(--bad);border-color:var(--bad)">Épuisement '+c.epuisement+'</span>':'')+'</div>':'')+
        (sl?'<div class="small" style="margin-top:8px">✨ '+sl+'</div>':'')+
        (c.inspiration?'<div class="small" style="margin-top:4px">⭐ Inspiration : '+c.inspiration+'</div>':'')+
        '</div>'}).join("");}

  case "biblio":{const t=state.bibType;const Q=state.bibQ.toLowerCase();
    const list=[...S.biblio.values()].filter(b=>b.type===t&&(!Q||(b.nom+" "+(b.desc||"")+" "+(b.classes||"")).toLowerCase().includes(Q))&&(t!=="sort"||state.bibNiv===""||String(num(b.niv))===state.bibNiv))
      .sort((a,b)=>t==="sort"?(num(a.niv)-num(b.niv)||String(a.nom).localeCompare(b.nom)):String(a.nom).localeCompare(b.nom));
    return '<div class="seg"><button data-bt="sort" class="'+(t==="sort"?"on":"")+'">✨ Sorts</button><button data-bt="objet" class="'+(t==="objet"?"on":"")+'">🗡️ Objets</button></div>'+
      '<div class="row" style="margin-bottom:10px"><input id="bibq" placeholder="Rechercher…" value="'+esc(state.bibQ)+'" style="flex:1">'+(t==="sort"?'<select id="bibniv" style="width:110px"><option value="">Tous niv.</option>'+[0,1,2,3,4,5,6,7,8,9].map(n=>'<option value="'+n+'" '+(state.bibNiv===String(n)?"selected":"")+'>'+(n?"Niv "+n:"Tours")+'</option>').join("")+'</select>':'')+'</div>'+
      (list.length?list.map(b=>'<button class="bib" data-bib="'+b.id+'"><div class="row"><b style="flex:1">'+esc(b.nom||"Sans nom")+'</b>'+(t==="sort"?'<span class="tag">'+(num(b.niv)?"Niv "+num(b.niv):"Tour")+'</span>'+(b.conc?'<span class="tag">C</span>':'')+(b.rituel?'<span class="tag">R</span>':''):'<span class="tag">'+esc(b.rarete||"")+'</span>'+(b.harmo?'<span class="tag">Harmo.</span>':''))+'</div>'+
        '<div class="small mute">'+esc(t==="sort"?[b.ecole,b.temps,b.portee,b.duree].filter(Boolean).join(" · "):(b.typeObj||""))+'</div>'+(b.desc?'<div class="small desc">'+esc(b.desc)+'</div>':'')+'</button>').join("")
       :'<div class="empty"><div class="big1">'+(t==="sort"?"✨":"🗡️")+'</div><p>'+(S.biblio.size?"Rien ne correspond.":"La bibliothèque est vide. Ajoutez vos sorts et objets une fois, puis piochez-les dans les fiches.")+'</p></div>')+
      (readOnly?'':'<button class="btn pri" data-act="newbib" style="width:100%;margin-top:12px;padding:12px">+ Ajouter '+(t==="sort"?"un sort":"un objet")+'</button>');}

  case "commun":{const m=G.commun.monnaie||{};const its=[...S.commun.values()].sort((a,b)=>String(a.nom).localeCompare(b.nom));const ps=persos().filter(c=>!c.retire);
    return '<div class="card"><h3>Trésor du groupe</h3><div class="grid g3">'+[["pp","Platine (PP)"],["po","Or (PO)"],["pe","Électrum (PE)"],["pa","Argent (PA)"],["pc","Cuivre (PC)"]].map(([k,n])=>GF(n,"groupe|commun|monnaie."+k,num(m[k]),"number",'data-t="n"')).join("")+'</div>'+
      '<div class="hint">Total en PO : <b>'+(+(num(m.pp)*10+num(m.po)+num(m.pe)*.5+num(m.pa)*.1+num(m.pc)*.01).toFixed(2))+'</b></div></div>'+
      '<div class="card"><h3>Objets communs ('+its.length+')</h3><div class="list">'+its.map(x=>'<div class="it"><input type="number" class="qty" data-gk="commun|'+x.id+'|qty" data-t="n" value="'+num(x.qty)+'"><div class="grow"><input placeholder="Objet" data-gk="commun|'+x.id+'|nom" value="'+esc(x.nom)+'"><input placeholder="Note" data-gk="commun|'+x.id+'|note" value="'+esc(x.note)+'">'+
        '<select data-gk="commun|'+x.id+'|porteur"><option value="">Porté par : personne</option>'+ps.map(c=>'<option value="'+c.id+'" '+(x.porteur===c.id?"selected":"")+'>Porté par : '+esc(c.nom)+'</option>').join("")+'</select></div><button class="del" data-delc="commun|'+x.id+'">✕</button></div>').join("")+
      '</div>'+(readOnly?'':'<button class="btn add" data-act="addcommun">+ Objet commun</button>')+'</div>';}

  case "planning":{const pl=G.planning.joueurs;const t0=today();
    const ses=[...S.sessions.values()].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
    const up=ses.filter(s=>!s.date||s.date>=t0),past=ses.filter(s=>s.date&&s.date<t0);const nx=nextAllDate();
    const sesCard=s=>{const d=s.dispo||{};const act=pl.filter(Boolean);const nOui=act.filter(p=>d[p]==="oui").length;const all=act.length&&nOui===act.length;const nNon=act.filter(p=>d[p]==="non").length;
      return '<div class="card ses '+(all?"ok":"")+'"><div class="row"><input type="date" data-gk="sessions|'+s.id+'|date" value="'+esc(s.date)+'" style="flex:1"><button class="del" data-delc="sessions|'+s.id+'">✕</button></div>'+
        '<div class="small" style="margin:6px 0 2px;font-weight:600">'+esc(fdate(s.date))+'</div>'+
        '<input placeholder="Note (lieu, heure…)" data-gk="sessions|'+s.id+'|note" value="'+esc(s.note)+'" style="margin:4px 0 8px">'+
        '<div class="dispo">'+act.map(p=>{const v=d[p]||"";return '<button class="dp d-'+(v||"x")+'" data-dispo="'+s.id+'" data-p="'+esc(p)+'"><span>'+esc(p)+'</span><b>'+DLAB[v]+'</b></button>'}).join("")+'</div>'+
        '<div class="small" style="margin-top:8px;color:'+(all?"var(--acc)":nNon?"var(--bad)":"var(--mute)")+'">'+(all?"✅ Tout le monde est dispo !":nOui+" / "+act.length+" dispo"+(nNon?" · "+nNon+" absent(s)":""))+'</div></div>'};
    const cs=[...S.courses.values()].sort((a,b)=>(a.fait?1:0)-(b.fait?1:0)||String(a.nom).localeCompare(b.nom));
    return (nx?'<div class="card nextses">🎉 Prochaine date où tout le monde est dispo : <b>'+esc(fdate(nx.date))+'</b></div>':'')+
      '<div class="card"><h3>Joueurs</h3><div class="hint" style="margin:-4px 0 8px">Touche un nom dans une date pour faire défiler : ? → Oui → Peut-être → Non.</div><div class="list">'+pl.map((p,i)=>'<div class="it"><input data-gk="groupe|planning|joueurs.'+i+'" value="'+esc(p)+'" placeholder="Prénom" data-rr><button class="del" data-rmj="'+i+'">✕</button></div>').join("")+'</div>'+
      (readOnly?'':'<button class="btn add" data-act="addjoueur">+ Joueur</button>')+'</div>'+
      '<div class="catt">Dates à venir</div>'+(up.length?up.map(sesCard).join(""):'<div class="hint" style="margin-bottom:10px">Aucune date proposée.</div>')+
      (readOnly?'':'<button class="btn pri" data-act="addses" style="width:100%;margin-bottom:12px">+ Proposer une date</button>')+
      (past.length?'<button class="btn" data-act="togpast" style="width:100%;margin-bottom:12px">'+(state.showPast?"Masquer":"Voir")+' les dates passées ('+past.length+')</button>'+(state.showPast?past.reverse().map(sesCard).join(""):''):'')+
      '<div class="card"><h3>🛒 Liste de courses</h3><div class="list">'+cs.map(x=>'<div class="it" style="align-items:center"><input type="checkbox" class="tog" data-gk="courses|'+x.id+'|fait" '+(x.fait?"checked":"")+' data-rr><div class="grow" style="grid-template-columns:1fr 110px"><input placeholder="Article" data-gk="courses|'+x.id+'|nom" value="'+esc(x.nom)+'" style="'+(x.fait?"text-decoration:line-through;opacity:.6":"")+'">'+
        '<select data-gk="courses|'+x.id+'|qui"><option value="">Qui ?</option>'+pl.filter(Boolean).map(p=>'<option '+(x.qui===p?"selected":"")+'>'+esc(p)+'</option>').join("")+'</select></div><button class="del" data-delc="courses|'+x.id+'">✕</button></div>').join("")+
      '</div>'+(readOnly?'':'<button class="btn add" data-act="addcourse">+ Article</button>'+(cs.some(x=>x.fait)?'<button class="btn sm" data-act="clearcourses" style="margin-top:8px">Retirer les articles cochés</button>':''))+'</div>';}

  case "journal":return '<div class="card"><h3>Journal de campagne</h3><div class="hint" style="margin:-4px 0 8px">Partagé avec tout le groupe : résumé des sessions, PNJ, quêtes, pactes…</div><textarea data-gk="groupe|journal|texte" style="min-height:60vh" placeholder="Session 1 : …">'+esc(G.journal.texte)+'</textarea></div>';
  }
  return "";
}

function pane(c){
  switch(state.tab){
  case "id": return '<div class="card"><div class="row" style="gap:14px;align-items:center"><label style="cursor:pointer"><div class="av avbig" style="border-color:'+c.couleur+';'+(c.avatar?'background-image:url('+c.avatar+')':'')+'">'+(c.avatar?"":"📷")+'</div><input type="file" accept="image/*" data-file="avatar" hidden></label>'+
    '<div style="flex:1" class="grid">'+F("Nom du personnage","nom",c)+F("Joueur","joueur",c)+'</div></div>'+
    '<div style="margin-top:12px"><label class="f">Couleur de la fiche</label><div class="colors">'+COLORS.map(x=>'<button data-color="'+x+'" class="'+(c.couleur===x?"on":"")+'" style="background:'+x+'"></button>').join("")+'</div></div>'+
    (c.avatar?'<button class="btn sm" data-act="rmavatar" style="margin-top:10px">Retirer la photo</button>':'')+'</div>'+
    '<div class="card"><h3>Classes · niveau total <span data-d="lvl"></span></h3>'+
    c.classes.map((x,i)=>'<div class="cls"><input list="dlc" placeholder="Classe" data-k="classes.'+i+'.nom" value="'+esc(x.nom)+'"><input placeholder="Sous-classe" data-k="classes.'+i+'.sous" value="'+esc(x.sous)+'"><input type="number" min="1" max="20" data-k="classes.'+i+'.niv" data-t="n" value="'+x.niv+'"><button class="del" data-rm="classes.'+i+'">✕</button></div>').join("")+
    '<datalist id="dlc">'+CLASSES.map(x=>'<option value="'+x+'">').join("")+'</datalist><button class="btn add" data-push="classes">+ Multiclasse</button></div>'+
    '<div class="card"><h3>Origines</h3><div class="grid g2">'+F("Race / Espèce","race",c)+F("Historique","historique",c)+F("Alignement","alignement",c)+F("Divinité / Patron","divinite",c)+F("Expérience (XP)","xp",c,"number",'data-t="n"')+'</div></div>'+
    (c.ownerId===myId?'<div class="card"><button class="btn" data-act="release" style="width:100%">Libérer cette fiche (ce n\'est pas mon perso)</button></div>':'')+'<div class="card"><button class="btn" data-act="retire" style="width:100%;margin-bottom:8px">'+(c.retire?'Remettre dans le groupe actif':'Marquer comme retiré (mort, en pause…)')+'</button><button class="btn" data-act="dup" style="width:100%;margin-bottom:8px">Dupliquer ce personnage</button><button class="btn bad" data-act="del" style="width:100%">Supprimer ce personnage</button></div>';

  case "car": return '<div class="card"><h3>Caractéristiques</h3><div class="ab">'+ABS.map(([k,n])=>
    '<div class="abil"><div class="nm">'+n+'</div><div class="md" data-d="mod:'+k+'"></div><div class="ring"><i data-d="ring:'+k+'"></i></div>'+
    '<div class="step"><button data-inc="car.'+k+'" data-v="-1">−</button><input type="number" data-k="car.'+k+'" data-t="n" value="'+c.car[k]+'"><button data-inc="car.'+k+'" data-v="1">+</button></div>'+
    '<label class="sv"><input type="checkbox" class="tog" data-k="sauv.'+k+'" '+(c.sauv[k]?"checked":"")+'> JS <b data-d="save:'+k+'"></b></label></div>').join("")+'</div>'+
    '<div class="hint">Total des caracs : <b data-d="sum"></b> · Le rond vert sous chaque carac = maîtrise du jet de sauvegarde.</div></div>'+
    '<div class="card"><h3>Bonus de maîtrise</h3><div class="row"><div class="big" style="grid-template-columns:1fr;flex:0 0 90px"><div><div class="v" data-d="prof"></div></div></div>'+
    '<div style="flex:1"><label class="row small"><input type="checkbox" class="tog" data-k="maitriseAuto" '+(c.maitriseAuto?"checked":"")+'> Calcul auto selon le niveau</label>'+
    (c.maitriseAuto?'':'<div style="margin-top:8px">'+F("Valeur manuelle","maitrise",c,"number",'data-t="n"')+'</div>')+'</div></div></div>'+
    '<div class="card"><h3>Inspiration</h3><div class="counter"><button data-inc="inspiration" data-v="-1" data-min="0">−</button><input type="number" data-k="inspiration" data-t="n" value="'+c.inspiration+'"><button data-inc="inspiration" data-v="1">+</button><span class="mute small">points d\'inspiration</span></div></div>';

  case "comp": return '<div class="card"><h3>Compétences</h3><div class="hint" style="margin:-4px 0 6px">Touche le rond : vide → maîtrise (M) → expertise (E). La case de droite = bonus divers.</div>'+
    SKILLS.map(([k,n,a])=>{const p=num(c.comp[k]||0);return '<div class="skill"><button class="prof p'+p+'" data-prof="'+k+'">'+(p===1?"M":p===2?"E":"")+'</button><div class="nm">'+n+'<small>('+ABN[a].slice(0,3)+')</small></div><input type="number" data-k="compBonus.'+k+'" data-t="n" value="'+(c.compBonus[k]||0)+'"><div class="tot" data-d="skill:'+k+'"></div></div>'}).join("")+
    '</div><div class="card"><h3>Sens passifs</h3><div class="big"><div><div class="small mute">Perception</div><div class="v" data-d="pp"></div></div><div><div class="small mute">Intuition</div><div class="v" data-d="pi"></div></div><div><div class="small mute">Investigation</div><div class="v" data-d="pinv"></div></div></div></div>';

  case "combat": {const cap=ARMORS[c.armure]||100;return '<div class="card"><h3>Points de vie</h3><div class="bar" style="height:24px"><i data-d="pvbar"></i><i data-d="tmpbar" style="background:var(--blue);opacity:.7"></i><div class="t" data-d="pvtxt"></div></div>'+
    '<div class="grid g3" style="margin-top:10px">'+F("Actuels","pv.act",c,"number",'data-t="n"')+F("Max","pv.max",c,"number",'data-t="n"')+F("Temporaires","pv.temp",c,"number",'data-t="n"')+'</div>'+
    '<div class="row" style="margin-top:10px"><input type="number" id="dmg" placeholder="Valeur" style="flex:1"><button class="btn" data-act="dmg" style="color:var(--bad)">Dégâts</button><button class="btn" data-act="heal" style="color:var(--acc)">Soin</button></div></div>'+
    '<div class="card"><div class="big"><div><div class="small mute">CA</div><input type="number" data-k="ca" data-t="n" value="'+c.ca+'"></div><div><div class="small mute">Initiative</div><div class="v" data-d="init"></div></div><div><div class="small mute">Vitesse (m)</div><input type="number" data-k="vitesse" data-t="n" value="'+c.vitesse+'"></div></div>'+
    '<div class="grid g2" style="margin-top:10px">'+F("Bonus d'initiative","initBonus",c,"number",'data-t="n"')+F("Dés de vie","desVie",c,"text",'placeholder="ex : 3d10 + 8d8"')+'</div></div>'+
    '<div class="card"><h3>Jets contre la mort</h3><div class="row" style="justify-content:space-between"><span class="small">Succès</span><div class="pips">'+[1,2,3].map(i=>'<button class="pip '+(c.dsSucc>=i?"on":"")+'" data-pip="dsSucc" data-v="'+i+'"></button>').join("")+'</div>'+
    '<span class="small">Échecs</span><div class="pips">'+[1,2,3].map(i=>'<button class="pip bad '+(c.dsEch>=i?"on":"")+'" data-pip="dsEch" data-v="'+i+'"></button>').join("")+'</div></div>'+
    '<div class="grid g2" style="margin-top:12px"><div><label class="f">Tombé à 0 PV</label><div class="counter"><button data-inc="tombe0" data-v="-1" data-min="0">−</button><input type="number" data-k="tombe0" data-t="n" value="'+c.tombe0+'"><button data-inc="tombe0" data-v="1">+</button></div></div>'+
    '<div><label class="f">Nombre de morts</label><div class="counter"><button data-inc="morts" data-v="-1" data-min="0">−</button><input type="number" data-k="morts" data-t="n" value="'+c.morts+'"><button data-inc="morts" data-v="1">+</button></div></div></div></div>'+
    '<div class="card"><h3>Armure & résistances</h3><label class="f">Type d\'armure</label><select data-k="armure" data-rr>'+Object.keys(ARMORS).map(a=>'<option '+(c.armure===a?"selected":"")+'>'+a+'</option>').join("")+'</select>'+
    '<div class="hint">Résistance physique max : '+cap+'%</div>'+
    RES.map(([k,n])=>{const mx=k==="physique"?cap:100;const v=Math.min(num(c.res[k]||0),mx);return '<div class="res"><span class="small">'+n+'</span><input type="range" min="0" max="'+mx+'" step="5" data-k="res.'+k+'" data-t="n" value="'+v+'"><span data-d="res:'+k+'">'+v+'%</span></div>'}).join("")+'</div>'+
    '<div class="card"><h3>États</h3><div class="chips">'+ETATS.map(e=>'<button class="chip '+(c.etats.includes(e)?"on":"")+'" data-etat="'+e+'">'+e+'</button>').join("")+'</div>'+
    '<label class="f" style="margin-top:12px">Épuisement (niveau 0 à 6)</label><div class="pips">'+[1,2,3,4,5,6].map(i=>'<button class="pip bad '+(c.epuisement>=i?"on":"")+'" data-pip="epuisement" data-v="'+i+'"></button>').join("")+'</div></div>'+
    '<div class="card"><h3>Attaques</h3><div class="list">'+c.attaques.map((a,i)=>'<div class="it"><div class="grow"><input placeholder="Arme / attaque" data-k="attaques.'+i+'.nom" value="'+esc(a.nom)+'"><div class="grid g2"><input placeholder="Bonus (ex : +9)" data-k="attaques.'+i+'.bonus" value="'+esc(a.bonus)+'"><input placeholder="Dégâts (ex : 1d8+5 tr.)" data-k="attaques.'+i+'.degats" value="'+esc(a.degats)+'"></div></div><button class="del" data-rm="attaques.'+i+'">✕</button></div>').join("")+
    '</div><button class="btn add" data-push="attaques">+ Attaque</button></div>';}

  case "sorts": return '<div class="card"><h3>Incantation</h3><label class="f">Caractéristique d\'incantation</label><select data-k="sortCar">'+ABS.map(([k,n])=>'<option value="'+k+'" '+(c.sortCar===k?"selected":"")+'>'+n+'</option>').join("")+'</select>'+
    '<div class="big" style="margin-top:10px;grid-template-columns:1fr 1fr"><div><div class="small mute">DD des sorts</div><div class="v" data-d="dd"></div></div><div><div class="small mute">Attaque de sort</div><div class="v" data-d="satk"></div></div></div></div>'+
    '<div class="card"><h3>Emplacements de sorts</h3><div class="hint" style="margin:-4px 0 6px">Indique le max, puis touche les ronds pour marquer ceux utilisés.</div>'+
    c.slots.map((s,i)=>'<div class="slot"><b>Niv '+(i+1)+'</b><input type="number" min="0" max="9" data-k="slots.'+i+'.max" data-t="n" data-rr value="'+s.max+'"><div class="pips">'+Array.from({length:num(s.max)},(_,j)=>'<button class="pip vio '+(s.used>j?"on":"")+'" data-slot="'+i+'" data-v="'+(j+1)+'"></button>').join("")+'</div></div>').join("")+
    '<h3 style="margin-top:14px">Emplacements de pacte (occultiste)</h3><div class="grid g2">'+F("Niveau des emplacements","pacte.niv",c,"number",'data-t="n"')+F("Nombre","pacte.max",c,"number",'data-t="n" data-rr')+'</div>'+
    '<div class="pips" style="margin-top:8px">'+Array.from({length:num(c.pacte.max)},(_,j)=>'<button class="pip vio '+(c.pacte.used>j?"on":"")+'" data-pacte="'+(j+1)+'"></button>').join("")+'</div>'+
    '<button class="btn" data-act="rest" style="width:100%;margin-top:12px">🌙 Repos long (tout récupérer)</button></div>'+
    '<div class="card"><h3>Ressources de classe</h3><div class="hint" style="margin:-4px 0 6px">Ex : Inspiration bardique, Second souffle, Ki, Rage, Manifestation d\'écho…</div><div class="list">'+
    c.ressources.map((r,i)=>'<div class="it"><div class="grow"><input placeholder="Nom" data-k="ressources.'+i+'.nom" value="'+esc(r.nom)+'"><div class="row"><div class="counter"><button data-inc="ressources.'+i+'.act" data-v="-1" data-min="0">−</button><input type="number" data-k="ressources.'+i+'.act" data-t="n" value="'+r.act+'"><button data-inc="ressources.'+i+'.act" data-v="1">+</button></div><span class="mute">/</span><input type="number" style="width:56px" data-k="ressources.'+i+'.max" data-t="n" value="'+r.max+'"><select data-k="ressources.'+i+'.reset" style="flex:1"><option '+(r.reset==="Repos court"?"selected":"")+'>Repos court</option><option '+(r.reset==="Repos long"?"selected":"")+'>Repos long</option><option '+(r.reset==="Autre"?"selected":"")+'>Autre</option></select></div></div><button class="del" data-rm="ressources.'+i+'">✕</button></div>').join("")+
    '</div><button class="btn add" data-push="ressources">+ Ressource</button><button class="btn" data-act="short" style="width:100%;margin-top:8px">☕ Repos court</button></div>'+
    '<div class="card"><h3>Sorts connus / préparés</h3><div class="list">'+
    [...c.sorts.map((s,i)=>[s,i])].sort((a,b)=>num(a[0].niv)-num(b[0].niv)).map(([s,i])=>'<div class="it"><div class="grow"><div class="row"><input type="number" min="0" max="9" style="width:56px" data-k="sorts.'+i+'.niv" data-t="n" value="'+s.niv+'" title="Niveau (0 = tour de magie)"><input placeholder="Nom du sort" data-k="sorts.'+i+'.nom" value="'+esc(s.nom)+'"></div>'+
      '<div class="row small"><label class="row"><input type="checkbox" class="tog" data-k="sorts.'+i+'.prep" '+(s.prep?"checked":"")+'> Préparé</label><label class="row"><input type="checkbox" class="tog" data-k="sorts.'+i+'.conc" '+(s.conc?"checked":"")+'> Concentration</label></div>'+
      '<input placeholder="Notes (portée, dégâts, durée…)" data-k="sorts.'+i+'.note" value="'+esc(s.note)+'"></div><button class="del" data-rm="sorts.'+i+'">✕</button></div>').join("")+
    '</div><button class="btn add" data-act="pickbib" data-bt="sort">📚 Depuis la bibliothèque</button><button class="btn add" data-push="sorts">+ Sort à la main</button><div class="hint">Niveau 0 = tour de magie.</div></div>';

  case "inv": {const mag=c.items.filter(x=>x.cat==="Équipé magique").length;
    return '<div class="card"><h3>Monnaie</h3><div class="grid g3">'+[["pp","Platine (PP)"],["po","Or (PO)"],["pe","Électrum (PE)"],["pa","Argent (PA)"],["pc","Cuivre (PC)"]].map(([k,n])=>F(n,"monnaie."+k,c,"number",'data-t="n"')).join("")+'</div>'+
    '<div class="hint">Total en PO : <b data-d="gold"></b></div>'+
    c.monnaieCustom.map((m,i)=>'<div class="row" style="margin-top:8px"><input placeholder="Autre monnaie (ex : FPO)" data-k="monnaieCustom.'+i+'.nom" value="'+esc(m.nom)+'"><input type="number" class="qty" data-k="monnaieCustom.'+i+'.val" data-t="n" value="'+m.val+'"><button class="del" data-rm="monnaieCustom.'+i+'">✕</button></div>').join("")+
    '<button class="btn add" data-push="monnaieCustom">+ Autre monnaie</button></div>'+
    '<div class="card"><h3>Objets</h3><div class="row small"><span style="flex:1">Objets magiques équipés : <b style="color:'+(mag>c.maxMagEquip?"var(--bad)":"var(--acc)")+'">'+mag+' / '+c.maxMagEquip+'</b></span><span class="mute">max</span><input type="number" class="qty" data-k="maxMagEquip" data-t="n" data-rr value="'+c.maxMagEquip+'"></div>'+
    CATS.map(cat=>{const its=c.items.map((x,i)=>[x,i]).filter(([x])=>x.cat===cat);if(!its.length)return"";
      return '<div class="catt">'+cat+' ('+its.length+')</div><div class="list">'+its.map(([x,i])=>'<div class="it"><input type="number" class="qty" data-k="items.'+i+'.qty" data-t="n" value="'+x.qty+'"><div class="grow"><input placeholder="Objet" data-k="items.'+i+'.nom" value="'+esc(x.nom)+'"><input placeholder="Effet / note" data-k="items.'+i+'.note" value="'+esc(x.note)+'"><select data-k="items.'+i+'.cat" data-rr>'+CATS.map(k=>'<option '+(k===cat?"selected":"")+'>'+k+'</option>').join("")+'</select></div><button class="del" data-rm="items.'+i+'">✕</button></div>').join("")+'</div>'}).join("")+
    '<div class="row" style="margin-top:12px"><select id="newcat" style="flex:1">'+CATS.map(k=>'<option>'+k+'</option>').join("")+'</select><button class="btn pri" data-act="additem">+ Objet</button><button class="btn" data-act="pickbib" data-bt="objet" title="Depuis la bibliothèque">📚</button></div></div>';}

  case "dons": return '<div class="card"><h3>Dons, traits & capacités</h3><div class="list">'+c.dons.map((d,i)=>'<div class="it"><div class="grow"><input placeholder="Nom (ex : Pourfendeur)" data-k="dons.'+i+'.nom" value="'+esc(d.nom)+'"><textarea placeholder="Effet" data-k="dons.'+i+'.desc" style="min-height:60px">'+esc(d.desc)+'</textarea></div><button class="del" data-rm="dons.'+i+'">✕</button></div>').join("")+
    '</div><button class="btn add" data-push="dons">+ Don / trait</button></div>';

  case "perso": return '<div class="card"><h3>Stats personnalisées</h3><div class="hint" style="margin:-4px 0 8px">Ajoute les stats propres à ta campagne : jauges (corruption, faveur divine…), compteurs, textes ou cases à cocher.</div><div class="list">'+
    c.custom.map((s,i)=>{let w="";
      if(s.type==="jauge"){const p=num(s.max)?clamp(num(s.val)/num(s.max),0,1):0;w='<div class="bar"><i style="width:'+(p*100)+'%;background:'+(s.col||"var(--violet)")+'"></i><div class="t">'+num(s.val)+' / '+num(s.max)+'</div></div><div class="row"><div class="counter"><button data-inc="custom.'+i+'.val" data-v="-1" data-min="0">−</button><input type="number" data-k="custom.'+i+'.val" data-t="n" data-rr value="'+num(s.val)+'"><button data-inc="custom.'+i+'.val" data-v="1">+</button></div><span class="mute">max</span><input type="number" class="qty" data-k="custom.'+i+'.max" data-t="n" data-rr value="'+num(s.max)+'"></div>'}
      else if(s.type==="nombre")w='<div class="counter"><button data-inc="custom.'+i+'.val" data-v="-1">−</button><input type="number" data-k="custom.'+i+'.val" data-t="n" value="'+num(s.val)+'"><button data-inc="custom.'+i+'.val" data-v="1">+</button></div>';
      else if(s.type==="case")w='<label class="row"><input type="checkbox" class="tog" data-k="custom.'+i+'.val" '+(s.val?"checked":"")+'> Activé</label>';
      else w='<input placeholder="Valeur" data-k="custom.'+i+'.val" value="'+esc(s.val)+'">';
      return '<div class="it"><div class="grow"><div class="row"><input placeholder="Nom de la stat" data-k="custom.'+i+'.nom" value="'+esc(s.nom)+'"><span class="chip">'+s.type+'</span></div>'+w+'</div><button class="del" data-rm="custom.'+i+'">✕</button></div>'}).join("")+
    '</div><div class="row" style="margin-top:12px"><select id="ctype" style="flex:1"><option value="jauge">Jauge (actuel / max)</option><option value="nombre">Compteur</option><option value="texte">Texte</option><option value="case">Case à cocher</option></select><button class="btn pri" data-act="addcustom">+ Stat</button></div></div>';

  case "notes": return '<div class="card"><h3>Histoire du personnage</h3><textarea data-k="histoire" style="min-height:160px" placeholder="Passé, motivations, liens…">'+esc(c.histoire)+'</textarea></div>'+
    '<div class="card"><h3>Notes de campagne</h3><textarea data-k="notes" style="min-height:220px" placeholder="PNJ, quêtes, pactes, indices…">'+esc(c.notes)+'</textarea></div>';
  }
  return "";
}



function derive(){
  const c=cur();if(!c)return;
  document.querySelectorAll("[data-d]").forEach(el=>{
    const [k,a]=el.dataset.d.split(":");
    switch(k){
      case "title":el.textContent=c.nom;break;
      case "lvl":el.textContent=level(c);break;
      case "mod":el.textContent=sg(mod(c.car[a]));break;
      case "ring":{const v=num(c.car[a]);el.style.width=clamp(v/30*100,0,100)+"%";el.style.background=abColor(v);break}
      case "save":el.textContent=sg(saveTot(c,a));break;
      case "sum":el.textContent=ABS.reduce((s,[x])=>s+num(c.car[x]),0);break;
      case "prof":el.textContent=sg(prof(c));break;
      case "skill":{const s=SKILLS.find(x=>x[0]===a);el.textContent=sg(skillTot(c,a,s[2]));break}
      case "pp":el.textContent=10+skillTot(c,"perception","sag");break;
      case "pi":el.textContent=10+skillTot(c,"intuition","sag");break;
      case "pinv":el.textContent=10+skillTot(c,"investigation","int");break;
      case "init":el.textContent=sg(mod(c.car.dex)+num(c.initBonus));break;
      case "pvbar":{const p=c.pv.max?clamp(c.pv.act/c.pv.max,0,1):0;el.style.width=p*100+"%";el.style.background=barColor(p);break}
      case "tmpbar":{const t=c.pv.max?clamp(num(c.pv.temp)/c.pv.max,0,1):0;const p=c.pv.max?clamp(c.pv.act/c.pv.max,0,1):0;el.style.left=Math.min(p,1-t)*100+"%";el.style.width=t*100+"%";break}
      case "pvtxt":el.textContent=c.pv.act+" / "+c.pv.max+(num(c.pv.temp)?"  (+"+c.pv.temp+" temp)":"");break;
      case "res":el.textContent=num(c.res[a]||0)+"%";break;
      case "dd":el.textContent=8+prof(c)+mod(c.car[c.sortCar]);break;
      case "satk":el.textContent=sg(prof(c)+mod(c.car[c.sortCar]));break;
      case "gold":{const m=c.monnaie;el.textContent=+(num(m.pp)*10+num(m.po)+num(m.pe)*.5+num(m.pa)*.1+num(m.pc)*.01).toFixed(2);break}
    }
  });
}

// ---------- Événements ----------
function rerenderPane(){const y=window.scrollY;if(state.view==="sheet"){const c=cur();const p=document.getElementById("pane");if(!p||!c)return;p.innerHTML=pane(c);derive()}else{const p=document.getElementById("hpane");if(p)p.innerHTML=homePane()}lockRO();window.scrollTo(0,y)}
function schedule(c){save("persos",c.id)}
function applyHP(c,v,heal){
  if(!heal){let r=v;const t=num(c.pv.temp);if(t){const u=Math.min(t,r);c.pv.temp=t-u;r-=u}const b=c.pv.act;c.pv.act=Math.max(0,c.pv.act-r);if(b>0&&c.pv.act===0){c.tombe0++;toast(c.nom+" tombe à 0 PV !")}}
  else{if(c.pv.act===0){c.dsSucc=0;c.dsEch=0}c.pv.act=Math.min(c.pv.max,c.pv.act+v)}
}
app.addEventListener("focusout",()=>{if(pendingRender)setTimeout(()=>{const a=document.activeElement;if(a&&app.contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;pendingRender=false;softRender()},60)});
app.addEventListener("input",e=>{
  const el=e.target;
  if(el.id==="bibq"){state.bibQ=el.value;clearTimeout(rerenderPane.q);rerenderPane.q=setTimeout(()=>{rerenderPane();const i=document.getElementById("bibq");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250);return}
  if(el.id==="bibniv"){state.bibNiv=el.value;rerenderPane();return}
  if(readOnly)return;
  if(el.dataset.gk){const [col,id,path]=el.dataset.gk.split("|");const o=getObj(col,id);if(!o)return;let v=el.type==="checkbox"?el.checked:el.value;if(el.dataset.t==="n")v=num(v);setP(o,path,v);save(col,id);
    if(el.dataset.rr!==undefined&&el.type==="checkbox")rerenderPane();return}
  const k=el.dataset.k;if(!k)return;const c=cur();if(!c||!canEdit(c))return;
  let v=el.type==="checkbox"?el.checked:el.value;if(el.dataset.t==="n")v=num(v);
  setP(c,k,v);schedule(c);derive();
  if(el.dataset.rr!==undefined&&el.tagName!=="SELECT"&&el.type!=="checkbox"){clearTimeout(rerenderPane.t);rerenderPane.t=setTimeout(rerenderPane,500)}
});
app.addEventListener("change",e=>{
  const el=e.target;const c=cur();
  if(el.dataset.file==="avatar"&&el.files[0]){loadAvatar(el.files[0]);return}
  if(el.dataset.gk&&el.dataset.rr!==undefined&&el.type!=="checkbox"){rerenderPane();return}
  if(!el.dataset.k||!c)return;
  if(el.tagName==="SELECT"||el.type==="checkbox"){if(el.dataset.rr!==undefined||el.dataset.k==="maitriseAuto"||el.dataset.k==="armure")rerenderPane()}
});
app.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const c=cur();const d=b.dataset;
  if(d.open){state.cur=d.open;state.view="sheet";state.tab="id";render();window.scrollTo(0,0);return}
  if(d.htab){state.view="home";state.home=d.htab;render();window.scrollTo(0,0);return}
  if(d.tab){state.tab=d.tab;render();window.scrollTo(0,0);return}
  if(d.pf){state.persoFilter=d.pf;rerenderPane();return}
  if(d.bt&&!d.act){state.bibType=d.bt;state.bibNiv="";rerenderPane();return}
  if(d.bib){return bibModal(S.biblio.get(d.bib))}
  if(d.act)return act(d.act,c,d);
  if(readOnly)return;
  if(d.dispo){const s=S.sessions.get(d.dispo);if(!s)return;s.dispo=s.dispo||{};const nv=DISPO[(DISPO.indexOf(s.dispo[d.p]||"")+1)%DISPO.length];s.dispo[d.p]=nv;upd("sessions",s.id,"dispo",d.p,nv);rerenderPane();return}
  if(d.delc){const [col,id]=d.delc.split("|");del(col,id);rerenderPane();return}
  if(d.rmj!==undefined){G.planning.joueurs.splice(num(d.rmj),1);save("groupe","planning",true);rerenderPane();return}
  if(!c||state.view!=="sheet"||!canEdit(c))return;
  if(d.color){c.couleur=d.color;schedule(c);render();return}
  if(d.inc){let v=num(getP(c,d.inc))+num(d.v);if(d.min!==undefined)v=Math.max(num(d.min),v);setP(c,d.inc,v);schedule(c);
    const inp=b.parentElement.querySelector('input[data-k="'+d.inc+'"]');if(inp)inp.value=v;derive();if(d.inc.startsWith("custom."))rerenderPane();return}
  if(d.prof){c.comp[d.prof]=(num(c.comp[d.prof]||0)+1)%3;schedule(c);rerenderPane();return}
  if(d.pip){const v=num(d.v);c[d.pip]=c[d.pip]===v?v-1:v;schedule(c);rerenderPane();return}
  if(d.slot!==undefined){const s=c.slots[num(d.slot)];const v=num(d.v);s.used=s.used===v?v-1:v;schedule(c);rerenderPane();return}
  if(d.pacte){const v=num(d.pacte);c.pacte.used=c.pacte.used===v?v-1:v;schedule(c);rerenderPane();return}
  if(d.etat){const i=c.etats.indexOf(d.etat);if(i>=0)c.etats.splice(i,1);else c.etats.push(d.etat);schedule(c);b.classList.toggle("on");return}
  if(d.rm){const ks=d.rm.split(".");const i=num(ks.pop());const arr=getP(c,ks.join("."));
    if(ks[0]==="classes"&&arr.length<=1){toast("Il faut au moins une classe");return}
    arr.splice(i,1);schedule(c);rerenderPane();return}
  if(d.push){const T={classes:{nom:"",sous:"",niv:1},attaques:{nom:"",bonus:"",degats:""},ressources:{nom:"",act:0,max:0,reset:"Repos long"},sorts:{niv:1,nom:"",prep:false,conc:false,note:""},dons:{nom:"",desc:""},monnaieCustom:{nom:"",val:0}};
    c[d.push].push(clone(T[d.push]));schedule(c);rerenderPane();return}
});
function act(a,c,d){
  if(a==="back"){state.view="home";render();window.scrollTo(0,0);return}
  if(a==="io")return ioModal();
  if(a==="logout"){signOut(window.__auth).then(()=>location.reload());return}
  if(a==="seed"){act.seeding||(act.seeding=1,importSeed());return}
  if(a==="togpast"){state.showPast=!state.showPast;rerenderPane();return}
  if(readOnly)return;
  if(a==="new"){const n=blank();S.persos.set(n.id,n);save("persos",n.id,true);state.cur=n.id;state.view="sheet";state.tab="id";render();return}
  if(a==="newbib")return bibModal(null);
  if(a==="addcommun"){const id=uid();S.commun.set(id,{id,nom:"",qty:1,note:"",porteur:""});save("commun",id,true);rerenderPane();return}
  if(a==="addjoueur"){G.planning.joueurs.push("");save("groupe","planning",true);rerenderPane();return}
  if(a==="addses"){const id=uid();S.sessions.set(id,{id,date:"",note:"",dispo:{}});save("sessions",id,true);rerenderPane();return}
  if(a==="addcourse"){const id=uid();S.courses.set(id,{id,nom:"",qui:"",fait:false});save("courses",id,true);rerenderPane();return}
  if(a==="clearcourses"){[...S.courses.values()].filter(x=>x.fait).forEach(x=>del("courses",x.id));rerenderPane();return}
  if(a==="grouprest"&&false)return confirmBox("Repos long pour tous les persos actifs : PV, emplacements et ressources au max ?",()=>{persos().filter(p=>!p.retire).forEach(p=>{longRest(p);save("persos",p.id,true)});rerenderPane();toast("Le groupe s'est reposé")},"Valider");
  if(!c)return;
  if(a==="mine"){if(c.ownerId&&c.ownerId!==myId)return;c.ownerId=myId||"";schedule(c);render();toast("C'est maintenant ton perso");return}
  if(!canEdit(c))return;
  if(a==="release"){c.ownerId="";schedule(c);render();toast("Fiche libérée");return}
  if(a==="pickbib")return pickBib(c,d.bt);
  if(a==="del")return confirmBox("Supprimer « "+c.nom+" » pour tout le groupe ? Action définitive. Tu peux aussi le marquer comme retiré.",()=>{del("persos",c.id);state.view="home";render();toast("Personnage supprimé")});
  if(a==="retire"){c.retire=!c.retire;schedule(c);rerenderPane();toast(c.retire?"Marqué comme retiré":"De retour dans le groupe");return}
  if(a==="dup"){const n=clone(c);n.id=uid();n.ownerId=myId||"";n.nom=c.nom+" (copie)";S.persos.set(n.id,n);save("persos",n.id,true);state.cur=n.id;render();toast("Copie créée");return}
  if(a==="rmavatar"){c.avatar="";schedule(c);render();return}
  if(a==="dmg"||a==="heal"){const v=Math.abs(num(document.getElementById("dmg").value));if(!v)return;applyHP(c,v,a==="heal");schedule(c);rerenderPane();return}
  if(a==="rest"){longRest(c);schedule(c);rerenderPane();toast("Repos long terminé");return}
  if(a==="short"){c.pacte.used=0;c.ressources.forEach(r=>{if(r.reset==="Repos court")r.act=r.max});schedule(c);rerenderPane();toast("Repos court : pacte et ressources récupérés");return}
  if(a==="additem"){const cat=document.getElementById("newcat").value;c.items.push({cat,nom:"",qty:1,note:""});schedule(c);rerenderPane();return}
  if(a==="addcustom"){const t=document.getElementById("ctype").value;c.custom.push({nom:"",type:t,val:t==="case"?false:(t==="texte"?"":0),max:10});schedule(c);rerenderPane();return}
}
function longRest(c){c.slots.forEach(s=>s.used=0);c.pacte.used=0;c.pv.act=c.pv.max;c.pv.temp=0;c.dsSucc=0;c.dsEch=0;c.epuisement=Math.max(0,c.epuisement-1);c.ressources.forEach(r=>r.act=r.max)}

// ---------- Bibliothèque ----------
function bibModal(b){
  const isNew=!b;const t=b?b.type:state.bibType;const o=b?clone(b):{id:uid(),type:t,nom:"",niv:1,ecole:"",temps:"1 action",portee:"",comp:"",duree:"Instantanée",conc:false,rituel:false,classes:"",desc:"",rarete:"Peu commun",harmo:false,typeObj:""};
  const fi=(l,k,ph,type)=>'<div><label class="f">'+l+'</label><input data-bk="'+k+'" type="'+(type||"text")+'" value="'+esc(o[k])+'" placeholder="'+(ph||"")+'"></div>';
  const ro=readOnly?"disabled":"";
  const m=modal('<h2>'+(isNew?"Nouveau ":"")+(t==="sort"?"sort":"objet")+'</h2><div class="grid">'+fi("Nom","nom")+
    (t==="sort"?'<div class="grid g2">'+fi("Niveau (0 = tour)","niv","","number")+'<div><label class="f">École</label><select data-bk="ecole"><option value=""></option>'+ECOLES.map(x=>'<option '+(o.ecole===x?"selected":"")+'>'+x+'</option>').join("")+'</select></div>'+fi("Temps d'incantation","temps")+fi("Portée","portee","18 m")+fi("Composantes","comp","V, S, M")+fi("Durée","duree")+'</div>'+
      '<div class="row"><label class="row small"><input type="checkbox" class="tog" data-bk="conc" '+(o.conc?"checked":"")+'> Concentration</label><label class="row small"><input type="checkbox" class="tog" data-bk="rituel" '+(o.rituel?"checked":"")+'> Rituel</label></div>'+fi("Classes","classes","Magicien, Occultiste…")
     :'<div class="grid g2">'+fi("Type","typeObj","Anneau, arme…")+'<div><label class="f">Rareté</label><select data-bk="rarete">'+RARETES.map(x=>'<option '+(o.rarete===x?"selected":"")+'>'+x+'</option>').join("")+'</select></div></div><label class="row small"><input type="checkbox" class="tog" data-bk="harmo" '+(o.harmo?"checked":"")+'> Harmonisation requise</label>')+
    '<div><label class="f">Description / effet</label><textarea data-bk="desc" style="min-height:120px">'+esc(o.desc)+'</textarea></div></div>'+
    '<div class="acts">'+(!isNew&&!readOnly?'<button class="btn bad" data-del style="margin-right:auto">Supprimer</button>':'')+'<button class="btn" data-x>'+(readOnly?"Fermer":"Annuler")+'</button>'+(readOnly?'':'<button class="btn pri" data-ok>Enregistrer</button>')+'</div>');
  if(readOnly)m.querySelectorAll("[data-bk]").forEach(e=>e.disabled=true);
  m.querySelector("[data-x]").onclick=()=>m.remove();
  const ok=m.querySelector("[data-ok]");if(ok)ok.onclick=()=>{m.querySelectorAll("[data-bk]").forEach(e=>{const k=e.dataset.bk;o[k]=e.type==="checkbox"?e.checked:(e.type==="number"?num(e.value):e.value)});
    if(!o.nom.trim()){toast("Donne un nom");return}S.biblio.set(o.id,o);save("biblio",o.id,true);m.remove();rerenderPane();toast("Enregistré dans la bibliothèque")};
  const dl=m.querySelector("[data-del]");if(dl)dl.onclick=()=>{m.remove();confirmBox("Supprimer « "+o.nom+" » de la bibliothèque ?",()=>{del("biblio",o.id);rerenderPane()})};
}
function pickBib(c,t){
  const list=()=>[...S.biblio.values()].filter(b=>b.type===t).sort((a,b)=>num(a.niv)-num(b.niv)||String(a.nom).localeCompare(b.nom));
  const m=modal('<h2>📚 '+(t==="sort"?"Ajouter un sort":"Ajouter un objet")+'</h2><input id="pq" placeholder="Rechercher…" style="margin-bottom:8px"><div id="pl"></div><div class="acts"><button class="btn" data-x>Fermer</button></div>');
  const draw=()=>{const Q=m.querySelector("#pq").value.toLowerCase();const l=list().filter(b=>!Q||b.nom.toLowerCase().includes(Q));
    m.querySelector("#pl").innerHTML=l.length?l.map(b=>'<button class="bib" data-pick="'+b.id+'"><b>'+esc(b.nom)+'</b> <span class="tag">'+(t==="sort"?(num(b.niv)?"Niv "+num(b.niv):"Tour"):esc(b.rarete||""))+'</span><div class="small mute">'+esc((b.desc||"").slice(0,90))+'</div></button>').join(""):'<p class="mute small">Rien dans la bibliothèque. Ajoute des '+(t==="sort"?"sorts":"objets")+' depuis l\'onglet Biblio de l\'accueil.</p>'};
  draw();m.querySelector("#pq").oninput=draw;m.querySelector("[data-x]").onclick=()=>m.remove();
  m.querySelector("#pl").onclick=e=>{const bt=e.target.closest("[data-pick]");if(!bt)return;const b=S.biblio.get(bt.dataset.pick);if(!b)return;
    if(t==="sort")c.sorts.push({niv:num(b.niv),nom:b.nom,prep:false,conc:!!b.conc,note:[b.portee,b.duree,b.desc].filter(Boolean).join(" · ").slice(0,300)});
    else c.items.push({cat:"Sac",nom:b.nom,qty:1,note:(b.desc||"").slice(0,300)});
    schedule(c);toast(b.nom+" ajouté");rerenderPane()};
}
function loadAvatar(file){
  const c=cur();const r=new FileReader();
  r.onload=()=>{const img=new Image();img.onload=()=>{const s=220;const cv=document.createElement("canvas");cv.width=cv.height=s;const x=cv.getContext("2d");
    const m=Math.min(img.width,img.height);x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,s,s);c.avatar=cv.toDataURL("image/jpeg",.82);schedule(c);render()};img.src=r.result};
  r.readAsDataURL(file);
}
function ioModal(){
  const m=modal('<h2>Importer / exporter</h2><p class="small mute">Exporter copie toutes les fiches au format texte (sauvegarde). Importer ajoute ou remplace les fiches collées ici.</p>'+
    '<button class="btn pri" data-ex style="width:100%">Copier toutes les fiches</button>'+
    (readOnly?'':'<label class="f" style="margin-top:14px">Coller des fiches à importer</label><textarea id="imp" placeholder="Colle ici le texte exporté"></textarea>')+
    '<div class="acts"><button class="btn" data-x>Fermer</button>'+(readOnly?'':'<button class="btn pri" data-im>Importer</button>')+'</div>');
  m.querySelector("[data-x]").onclick=()=>m.remove();
  m.querySelector("[data-ex]").onclick=async()=>{const t=JSON.stringify([...S.persos.values()]);try{await navigator.clipboard.writeText(t);toast("Fiches copiées")}catch(e){const ta=m.querySelector("#imp");if(ta){ta.value=t;ta.select()}toast("Copie bloquée : sélectionne le texte et copie-le")}};
  const im=m.querySelector("[data-im]");if(im)im.onclick=()=>{try{let d=JSON.parse(m.querySelector("#imp").value);if(!Array.isArray(d))d=[d];let n=0;
    d.forEach(x=>{if(x&&typeof x==="object"&&x.car&&x.id){const c=normPerso(clone(x));S.persos.set(c.id,c);save("persos",c.id,true);n++}});
    m.remove();render();toast(n+" fiche(s) importée(s)")}catch(e){toast("Texte invalide")}};
}

// ---------- Démarrage, connexion ----------
const fbApp=initializeApp(firebaseConfig);const auth=getAuth(fbApp);window.__auth=auth;
const fdb=initializeFirestore(fbApp,{localCache:persistentLocalCache()});
let started=false;
const errMsg=e=>({"auth/invalid-credential":"E-mail ou mot de passe incorrect.","auth/invalid-email":"Adresse e-mail invalide.","auth/email-already-in-use":"Cette adresse a déjà un compte : connecte-toi.","auth/weak-password":"Mot de passe trop court (6 caractères minimum).","auth/missing-password":"Entre un mot de passe.","auth/network-request-failed":"Pas de connexion internet.","permission-denied":"Code du groupe incorrect."}[e&&e.code]||("Erreur : "+((e&&(e.code||e.message))||"inconnue")));
function loginScreen(mode){
  const reg=mode==="reg";
  app.innerHTML='<div class="login"><h1>⚔️ Fiches JDR</h1><div class="sub">'+(reg?"Créer ton compte":"Connexion")+'</div><div class="grid">'+
    '<div><label class="f">E-mail</label><input id="le" type="email" autocomplete="email"></div>'+
    '<div><label class="f">Mot de passe</label><input id="lp" type="password" autocomplete="'+(reg?"new-password":"current-password")+'"></div>'+
    '<div class="err" id="lerr"></div><button class="btn pri" id="lgo" style="padding:12px">'+(reg?"Créer mon compte":"Se connecter")+'</button>'+
    '<button class="lnkbtn" id="lsw">'+(reg?"J'ai déjà un compte":"Pas encore de compte ? En créer un")+'</button>'+(reg?'':'<button class="lnkbtn" id="lfg" style="color:var(--mute)">Mot de passe oublié</button>')+'</div></div>';
  const v=id=>document.getElementById(id).value.trim();const err=t=>document.getElementById("lerr").textContent=t;
  document.getElementById("lsw").onclick=()=>loginScreen(reg?"":"reg");
  const fg=document.getElementById("lfg");if(fg)fg.onclick=async()=>{if(!v("le"))return err("Entre ton e-mail d'abord.");try{await sendPasswordResetEmail(auth,v("le"));err("E-mail de réinitialisation envoyé.")}catch(e){err(errMsg(e))}};
  document.getElementById("lgo").onclick=async()=>{err("");try{if(reg)await createUserWithEmailAndPassword(auth,v("le"),document.getElementById("lp").value);else await signInWithEmailAndPassword(auth,v("le"),document.getElementById("lp").value)}catch(e){err(errMsg(e))}};
}
function joinScreen(u){
  app.innerHTML='<div class="login"><h1>⚔️ Rejoindre le groupe</h1><div class="sub">Connecté : '+esc(u.email)+'</div><div class="grid">'+
    '<div><label class="f">Ton prénom</label><input id="jn" placeholder="Jerem"></div>'+
    '<div><label class="f">Code du groupe (demande-le au créateur)</label><input id="jc" autocapitalize="off"></div>'+
    '<div class="err" id="jerr"></div><button class="btn pri" id="jgo" style="padding:12px">Rejoindre</button><button class="lnkbtn" id="jout" style="color:var(--mute)">Changer de compte</button></div></div>';
  const err=t=>document.getElementById("jerr").textContent=t;
  document.getElementById("jout").onclick=()=>signOut(auth);
  document.getElementById("jgo").onclick=async()=>{const nom=document.getElementById("jn").value.trim(),code=document.getElementById("jc").value.trim();if(!nom||!code)return err("Remplis les deux champs.");
    try{await setDoc(doc(fdb,"users",u.uid),{nom,code,email:u.email||""});me={nom};start()}catch(e){err(errMsg(e))}};
}
function start(){if(started)return;started=true;remote={db:fdb};lsLoad();render();subscribe()}
onAuthStateChanged(auth,async u=>{
  if(!u){started=false;myId=null;return loginScreen("")}
  myId=u.uid;
  try{const p=await getDoc(doc(fdb,"users",u.uid));if(p.exists()){me=p.data();start()}else joinScreen(u)}
  catch(e){if(e&&e.code==="permission-denied")joinScreen(u);else{app.innerHTML='<div class="login"><h1>⚔️ Fiches JDR</h1><p class="sub">Impossible de joindre la base. Vérifie ta connexion.</p><button class="btn pri" onclick="location.reload()" style="width:100%">Réessayer</button></div>'}}
});
// Bouton retour Android
try{const C=window.Capacitor;if(C&&C.Plugins&&C.Plugins.App)C.Plugins.App.addListener("backButton",()=>{if(document.querySelector(".modal")){document.querySelector(".modal").remove();return}if(state.view==="sheet"){state.view="home";render();return}if(state.home!=="persos"){state.home="persos";render();return}C.Plugins.App.exitApp()})}catch(e){}
})();

