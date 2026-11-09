
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, FieldPath, writeBatch, deleteField } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config.js";
const fs={doc,collection,onSnapshot,setDoc,updateDoc,deleteDoc,getDoc,FieldPath,writeBatch,deleteField};
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
const HTABS=[["persos","Persos","🧙"],["combat","Combat","⚔️"],["mj","Vue MJ","👁️"],["biblio","Biblio","📚"],["commun","Commun","💰"],["planning","Planning","📅"],["journal","Journal","📖"]];
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
    monnaie:{pc:0,pa:0,pe:0,po:0,pp:0},monnaieCustom:[],maxMagEquip:4,items:[],dons:[],histoire:"",notes:"",custom:[],passifs:[],favs:[],retire:false,updated:Date.now()};
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
const GDEF=()=>({journal:{texte:""},commun:{monnaie:{pp:0,po:0,pe:0,pa:0,pc:0}},planning:{joueurs:[]},combat:{actif:false,round:1,tour:"",lignes:{}}});
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
  ["journal","commun","planning","combat"].forEach(k=>{
    fs.onSnapshot(ref("groupe",k),snap=>{if(k!=="combat"&&busyKey(keyOf("groupe",k)))return;if(snap.exists()){if(k==="combat"){const was=G.combat&&G.combat.actif,now=snap.data().actif;if(now&&!was&&started&&G.combat)swordsAnim(true)}G[k]=Object.assign(GDEF()[k],clone(snap.data()));lsSave();softRender()}},()=>{});
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
  const title={persos:"⚔️ Fiches JDR",combat:"⚔️ Combat",mj:"👁️ Vue MJ",biblio:"📚 Bibliothèque",commun:"💰 Inventaire commun",planning:"📅 Planning",journal:"📖 Journal"}[state.home];
  app.innerHTML='<div class="top"><div class="wrap"><h1>'+title+'</h1><span class="status" id="st">'+esc(saveStatus)+'</span>'+(state.home==="persos"?'<button class="ico" data-act="io" title="Importer / exporter">⇅</button><button class="ico" data-act="logout" title="Se déconnecter">⎋</button>':'')+'</div></div>'+
    '<div class="wrap">'+roBanner()+'<div id="hpane">'+homePane()+'</div></div>'+
    '<nav class="tabs"><div class="in">'+HTABS.map(t=>'<button data-htab="'+t[0]+'" class="'+(state.home===t[0]?"on":"")+'"><b>'+t[2]+'</b>'+t[1]+'</button>').join("")+'</div></nav>';
  lockRO();if(state.home==="combat")derive();
}
function lockRO(){if(state.view==="sheet"&&!canEdit(cur())){app.querySelectorAll("#pane input,#pane select,#pane textarea,#pane button:not([data-tab])").forEach(e=>e.disabled=true);return}if(!readOnly)return;app.querySelectorAll("#pane input,#pane select,#pane textarea,#hpane input,#hpane select,#hpane textarea").forEach(e=>{if(e.id!=="bibq"&&e.id!=="bibniv")e.disabled=true})}

function nextAllDate(){const pl=G.planning.joueurs.filter(Boolean);if(!pl.length)return null;
  return [...S.sessions.values()].filter(s=>s.date&&s.date>=today()&&pl.every(p=>(s.dispo||{})[p]==="oui")).sort((a,b)=>a.date.localeCompare(b.date))[0]||null}

function homePane(){
  switch(state.home){
  case "combat":return combatPane();
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

  case "biblio":{const t=state.bibType;loadSRD();
    const all=bibList(t,state.bibQ,state.bibNiv,state.bibCls?[state.bibCls]:null);const list=all.slice(0,80);
    return '<div class="seg"><button data-bt="sort" class="'+(t==="sort"?"on":"")+'">✨ Sorts</button><button data-bt="objet" class="'+(t==="objet"?"on":"")+'">🗡️ Objets</button></div>'+
      '<div class="row" style="margin-bottom:8px"><input id="bibq" placeholder="Rechercher…" value="'+esc(state.bibQ)+'" style="flex:1">'+(t==="sort"?'<select id="bibniv" style="width:100px"><option value="">Tous niv.</option>'+[0,1,2,3,4,5,6,7,8,9].map(n=>'<option value="'+n+'" '+(state.bibNiv===String(n)?"selected":"")+'>'+(n?"Niv "+n:"Tours")+'</option>').join("")+'</select>':'')+'</div>'+
      (t==="sort"?'<select id="bibcls" style="margin-bottom:10px"><option value="">Toutes les classes</option>'+CLASSES_SORTS.map(k=>'<option'+(state.bibCls===k?" selected":"")+'>'+k+'</option>').join("")+'</select><div class="small mute" style="margin-bottom:8px">'+all.length+' sort(s)'+(SRD.length?' · '+SRD.length+' sorts officiels du SRD + ceux du groupe':' · chargement des sorts officiels…')+'</div>':'')+
      (list.length?list.map(b=>'<button class="bib" data-bib="'+b.id+'"><div class="row"><b style="flex:1">'+esc(b.nom||"Sans nom")+'</b>'+(t==="sort"?'<span class="tag">'+(num(b.niv)?"Niv "+num(b.niv):"Tour")+'</span>'+(b.conc?'<span class="tag">C</span>':'')+(b.rituel?'<span class="tag">R</span>':'')+(b.srd?'':'<span class="tag" style="color:var(--acc)">Groupe</span>'):'<span class="tag">'+esc(b.rarete||"")+'</span>'+(b.harmo?'<span class="tag">Harmo.</span>':''))+'</div>'+
        '<div class="small mute">'+esc(t==="sort"?[b.ecole,b.temps,b.portee,b.classes].filter(Boolean).join(" · "):(b.typeObj||""))+'</div>'+(b.dmg?'<div class="small" style="color:var(--warn)">'+esc((b.dmg.perso?b.dmg.perso[1]:b.dmg.slots&&b.dmg.slots[Object.keys(b.dmg.slots)[0]])+" "+b.dmg.type)+'</div>':'')+'</button>').join("")+(all.length>list.length?'<div class="small mute" style="text-align:center;margin:8px">'+(all.length-list.length)+' autres : affine la recherche.</div>':'')
       :'<div class="empty"><div class="big1">'+(t==="sort"?"✨":"🗡️")+'</div><p>Rien ne correspond.</p></div>')+
      (readOnly?'':'<button class="btn pri" data-act="newbib" style="width:100%;margin-top:12px;padding:12px">+ Ajouter '+(t==="sort"?"un sort maison":"un objet")+'</button>');}

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
    atkEditor(c);}

  case "sorts": return '<div class="card"><h3>Incantation</h3><label class="f">Caractéristique d\'incantation</label><select data-k="sortCar">'+ABS.map(([k,n])=>'<option value="'+k+'" '+(c.sortCar===k?"selected":"")+'>'+n+'</option>').join("")+'</select>'+
    '<div class="big" style="margin-top:10px;grid-template-columns:1fr 1fr"><div><div class="small mute">DD des sorts</div><div class="v" data-d="dd"></div></div><div><div class="small mute">Attaque de sort</div><div class="v" data-d="satk"></div></div></div></div>'+
    '<div class="card"><h3>Emplacements de sorts</h3>'+((calcSlots(c).slots.length||calcSlots(c).pacte)?'<button class="btn sm" data-act="slotcalc" style="margin-bottom:8px">✨ Calculer selon les règles D&D</button>':'')+'<div class="hint" style="margin:-4px 0 6px">Indique le max, puis touche les ronds pour marquer ceux utilisés.</div>'+
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
function rerenderPane(){const y=window.scrollY;if(state.view==="sheet"){const c=cur();const p=document.getElementById("pane");if(!p||!c)return;p.innerHTML=pane(c);derive()}else{const p=document.getElementById("hpane");if(p)p.innerHTML=homePane();if(state.home==="combat")derive()}lockRO();window.scrollTo(0,y)}
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
  if(el.id==="bibcls"){state.bibCls=el.value;rerenderPane();return}
  if(readOnly)return;
  if(el.dataset.cinit||el.dataset.cpv||el.dataset.cpvmax){const id=el.dataset.cinit||el.dataset.cpv||el.dataset.cpvmax;const f=el.dataset.cinit?"init":el.dataset.cpv?"pv":"pvmax";const l=(G.combat.lignes||{})[id];if(!l)return;
    const v=el.value===""&&f==="init"?"":num(el.value);l[f]=v;clearTimeout(cbTimers[id+f]);cbTimers[id+f]=setTimeout(()=>cbUpdate({["lignes."+id+"."+f]:v}),600);return}
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
  if(d.htab){if(d.htab!==state.home||state.view!=="home"){if(d.htab==="combat")swordsAnim(false);else tabAnim(d.htab)}state.view="home";state.home=d.htab;render();window.scrollTo(0,0);return}
  if(d.tab){state.tab=d.tab;render();window.scrollTo(0,0);return}
  if(d.pf){state.persoFilter=d.pf;rerenderPane();return}
  if(d.bt&&!d.act){state.bibType=d.bt;state.bibNiv="";rerenderPane();return}
  if(d.bib){const b=getBib(d.bib);return b&&b.srd?srdModal(b):bibModal(b)}
  if(d.act)return act(d.act,c,d);
  if(readOnly)return;
  if(d.dispo){const s=S.sessions.get(d.dispo);if(!s)return;s.dispo=s.dispo||{};const nv=DISPO[(DISPO.indexOf(s.dispo[d.p]||"")+1)%DISPO.length];s.dispo[d.p]=nv;upd("sessions",s.id,"dispo",d.p,nv);rerenderPane();return}
  if(d.delc){const [col,id]=d.delc.split("|");del(col,id);rerenderPane();return}
  if(d.rmj!==undefined){G.planning.joueurs.splice(num(d.rmj),1);save("groupe","planning",true);rerenderPane();return}
  if(!c||!(state.view==="sheet"||state.home==="combat")||!canEdit(c))return;
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
  if(d.push){const T={classes:{nom:"",sous:"",niv:1},attaques:{nom:"",bonus:"",degats:""},ressources:{nom:"",act:0,max:0,reset:"Repos long"},sorts:{niv:1,nom:"",prep:false,conc:false,note:""},dons:{nom:"",desc:""},monnaieCustom:{nom:"",val:0},des:{n:"1d6",type:""},fixe:{label:"",val:1,type:""},pct:{label:"",val:10,type:""},passifs:{label:"",val:0,type:"",applique:"arme",parTour:false,siType:"",note:""}};
    let arr=getP(c,d.push);if(!Array.isArray(arr)){setP(c,d.push,[]);arr=getP(c,d.push)}arr.push(clone(T[d.push.split(".").pop()]));schedule(c);rerenderPane();return}
});
function act(a,c,d){
  if(a==="back"){state.view="home";render();window.scrollTo(0,0);return}
  if(a==="io")return ioModal();
  if(a==="logout"){signOut(window.__auth).then(()=>location.reload());return}
  if(a==="seed"){act.seeding||(act.seeding=1,importSeed());return}
  if(a==="eco"||a==="ecoreset"||a==="sexp"||a==="cbperso"){combatAct(a,d);return}
  if(a==="cardopen"&&c){cardModal(c,d.key);return}
  if(a==="deckf"){state.deckF=d.f;rerenderPane();return}
  if(a==="tlreset"){state.turnLog=[];rerenderPane();return}
  if(a==="ptog"){const k="p_"+d.l;state.eco[k]=!state.eco[k];rerenderPane();return}
  if(a==="togpast"){state.showPast=!state.showPast;rerenderPane();return}
  if(readOnly)return;
  if(combatAct(a,d))return;
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
  if(a==="cast"){castSpell(c,+d.i);return}
  if(a==="atkopen"){attackModal(c,"list");return}
  if(a==="atknew"){c.attaques.push({nom:"",kind:"arme",main:"",carac:"dex",maitrise:true,modDegats:true,jetAttaque:true,bonusToucher:0,des:[{n:"1d8",type:"tranchant"}],fixe:[],pct:[],degats:""});schedule(c);rerenderPane();return}
  if(a==="atkstruct"){const x=c.attaques[+d.i];Object.assign(x,{main:"",carac:"dex",maitrise:true,modDegats:true,bonusToucher:0,des:[{n:"1d8",type:""}],fixe:[],pct:[]});schedule(c);rerenderPane();return}
  if(a==="atkpreset"){applyPreset(c);schedule(c);rerenderPane();toast("Actions de combat à jour : vérifie les dés de Kuroi Ventus");return}
  if(a==="slotcalc"){const r=calcSlots(c);return confirmBox("Mettre tes emplacements selon les règles D&D ? "+slotText(r)+".",()=>{applySlots(c);state.showCalc=false;schedule(c);rerenderPane();toast("Emplacements mis à jour")},"Appliquer")}
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
  loadSRD();const mc=myClasses(c);let only=t==="sort"&&mc.length>0;
  const m=modal('<h2>📚 '+(t==="sort"?"Ajouter un sort":"Ajouter un objet")+'</h2><input id="pq" placeholder="Rechercher…" style="margin-bottom:8px">'+
    (t==="sort"?(mc.length?'<label class="row small" style="margin-bottom:6px"><input type="checkbox" class="tog" id="ponly" checked> Seulement les sorts de '+esc(mc.join(", "))+'</label>':'')+'<label class="row small" style="margin-bottom:8px"><input type="checkbox" class="tog" id="patk" checked> Créer l\'action d\'attaque si le sort fait des dégâts</label>':'')+
    '<div id="pl"></div><div class="acts"><button class="btn" data-x>Fermer</button></div>');
  const draw=()=>{const l=bibList(t,m.querySelector("#pq").value,"",only?mc:null).slice(0,60);
    m.querySelector("#pl").innerHTML=l.length?l.map(b=>'<button class="bib" data-pick="'+b.id+'"><b>'+esc(b.nom)+'</b> <span class="tag">'+(t==="sort"?(num(b.niv)?"Niv "+num(b.niv):"Tour"):esc(b.rarete||""))+'</span>'+(b.dmg?' <span class="tag" style="color:var(--warn)">'+esc(b.dmg.type)+'</span>':'')+'<div class="small mute">'+esc(t==="sort"?[b.ecole,b.portee,b.classes].filter(Boolean).join(" · "):(b.desc||"").slice(0,90))+'</div></button>').join(""):'<p class="mute small">Rien ne correspond.</p>'};
  draw();m.querySelector("#pq").oninput=draw;m.querySelector("[data-x]").onclick=()=>m.remove();
  const po=m.querySelector("#ponly");if(po)po.onchange=()=>{only=po.checked;draw()};
  m.querySelector("#pl").onclick=e=>{const bt=e.target.closest("[data-pick]");if(!bt)return;const b=getBib(bt.dataset.pick);if(!b)return;
    if(t==="sort"){const pa=m.querySelector("#patk");const atk=addSortToPerso(c,b,pa&&pa.checked);toast(b.nom+" ajouté"+(atk?" (et aux attaques)":""))}
    else{c.items.push({cat:"Sac",nom:b.nom,qty:1,note:(b.desc||"").slice(0,300)});schedule(c);toast(b.nom+" ajouté")}
    rerenderPane()};
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

// ---------- Attaques : choix d'une action, dés réels, passifs automatiques ----------
const TYPES=["tranchant","perforant","contondant","nécrotique","radiant","feu","froid","foudre","tonnerre","poison","acide","force","psychique","vitalité"];
const MAINS={D:"Main droite",G:"Main gauche","":""};
const KINDS={arme:"Attaque d'arme",sort:"Sort",autre:"Autre (capacité, invocation…)"};
const APPL={arme:"Attaques d'arme",attaque:"Tout jet d'attaque (arme ou sort)",tout:"Toutes les actions"};
const atkKind=a=>a.kind||"arme";
const atkRoll=a=>a.jetAttaque!==undefined?a.jetAttaque:atkKind(a)==="arme";
const atkHit=(c,a)=>(a.carac?mod(c.car[a.carac]):0)+(a.maitrise!==false&&a.carac?prof(c):0)+num(a.bonusToucher);
const isStruct=a=>Array.isArray(a.des);
function typeSel(path,val){return '<select data-k="'+path+'" class="tsel"><option value=""'+(val?"":" selected")+'>(type)</option>'+TYPES.map(t=>'<option'+(t===val?" selected":"")+'>'+t+'</option>').join("")+(val&&!TYPES.includes(val)?'<option selected>'+esc(val)+'</option>':'')+'</select>'}
const sel=(path,val,opts,extra)=>'<select data-k="'+path+'" '+(extra||"")+'>'+Object.entries(opts).map(([k,l])=>'<option value="'+k+'"'+(k===(val||"")?" selected":"")+'>'+l+'</option>').join("")+'</select>';
// Éditeur dans la fiche (onglet Combat)
function atkEditor(c){
  const ress={"":"Aucun coût"};c.ressources.forEach(r=>{if(r.nom)ress[r.nom]=r.nom});
  return '<div class="card"><h3>Actions d\'attaque</h3><div class="hint" style="margin:-4px 0 8px">Décris chaque attaque une fois. Dans l\'onglet ⚔️ Combat, le bouton « Attaquer » te les propose et calcule les dégâts à partir de tes vrais dés.</div>'+
  c.attaques.map((a,i)=>{const P="attaques."+i;
    if(!isStruct(a))return '<div class="atkcard"><div class="row"><input placeholder="Arme / attaque" data-k="'+P+'.nom" value="'+esc(a.nom)+'"><button class="del" data-rm="'+P+'">✕</button></div><div class="grid g2" style="margin-top:6px"><input placeholder="Bonus" data-k="'+P+'.bonus" value="'+esc(a.bonus)+'"><input placeholder="Dégâts" data-k="'+P+'.degats" value="'+esc(a.degats)+'"></div><button class="btn sm" data-act="atkstruct" data-i="'+i+'" style="margin-top:8px">⚙️ Activer le calcul automatique</button></div>';
    return '<details class="atkcard"><summary><b>'+esc(a.nom||"Nouvelle attaque")+'</b> <span class="small mute">'+esc(KINDS[atkKind(a)])+'</span></summary><div class="row" style="margin-top:8px"><input placeholder="Nom" data-k="'+P+'.nom" value="'+esc(a.nom)+'"><button class="del" data-rm="'+P+'">✕</button></div>'+
    '<div class="grid g2" style="margin-top:8px"><div><label class="f">Type d\'action</label>'+sel(P+".kind",atkKind(a),KINDS,"data-rr")+'</div><div><label class="f">Main</label>'+sel(P+".main",a.main,{"":"-",D:"Droite",G:"Gauche"})+'</div>'+
    '<div><label class="f">Caractéristique</label><select data-k="'+P+'.carac" data-rr><option value="">Aucune</option>'+ABS.map(([k,n])=>'<option value="'+k+'"'+(a.carac===k?" selected":"")+'>'+n+'</option>').join("")+'</select></div>'+
    '<div><label class="f">Bonus au toucher</label><input type="number" data-k="'+P+'.bonusToucher" data-t="n" value="'+num(a.bonusToucher)+'"></div>'+
    '<div style="grid-column:1/3"><label class="f">Coût par utilisation</label>'+sel(P+".cout",a.cout,ress)+'</div></div>'+
    '<div class="row small" style="margin-top:8px;gap:12px;flex-wrap:wrap"><label class="row"><input type="checkbox" class="tog" data-k="'+P+'.jetAttaque" '+(atkRoll(a)?"checked":"")+'> Jet d\'attaque</label><label class="row"><input type="checkbox" class="tog" data-k="'+P+'.maitrise" '+(a.maitrise!==false?"checked":"")+'> Maîtrise</label><label class="row"><input type="checkbox" class="tog" data-k="'+P+'.modDegats" '+(a.modDegats!==false?"checked":"")+'> Carac. aux dégâts</label><label class="row"><input type="checkbox" class="tog" data-k="'+P+'.sansPassifs" '+(a.sansPassifs?"checked":"")+'> Sans bonus passifs</label></div>'+
    (a.carac&&atkRoll(a)?'<div class="small" style="margin-top:6px">Toucher : <b>'+sg(atkHit(c,a))+'</b></div>':'')+
    '<label class="f" style="margin-top:10px">Dés de dégâts</label>'+(a.des||[]).map((d,j)=>'<div class="row" style="margin-bottom:6px"><input style="width:80px" placeholder="1d8" data-k="'+P+'.des.'+j+'.n" value="'+esc(d.n)+'">'+typeSel(P+'.des.'+j+'.type',d.type)+'<button class="del" data-rm="'+P+'.des.'+j+'">✕</button></div>').join("")+'<button class="btn sm" data-push="'+P+'.des">+ Dé</button>'+
    '<label class="f" style="margin-top:10px">Bonus fixes</label>'+(a.fixe||[]).map((d,j)=>'<div class="row" style="margin-bottom:6px"><input placeholder="Nom" data-k="'+P+'.fixe.'+j+'.label" value="'+esc(d.label)+'"><input style="width:60px" type="number" data-k="'+P+'.fixe.'+j+'.val" data-t="n" value="'+num(d.val)+'">'+typeSel(P+'.fixe.'+j+'.type',d.type)+'<button class="del" data-rm="'+P+'.fixe.'+j+'">✕</button></div>').join("")+'<button class="btn sm" data-push="'+P+'.fixe">+ Bonus fixe</button>'+
    '<label class="f" style="margin-top:10px">Bonus en %</label>'+(a.pct||[]).map((d,j)=>'<div class="row" style="margin-bottom:6px"><input placeholder="Nom" data-k="'+P+'.pct.'+j+'.label" value="'+esc(d.label)+'"><input style="width:60px" type="number" data-k="'+P+'.pct.'+j+'.val" data-t="n" value="'+num(d.val)+'"><span>%</span>'+typeSel(P+'.pct.'+j+'.type',d.type)+'<button class="del" data-rm="'+P+'.pct.'+j+'">✕</button></div>').join("")+'<button class="btn sm" data-push="'+P+'.pct">+ Bonus en %</button>'+
    '<label class="f" style="margin-top:10px">Note / rappel</label><input placeholder="Portée, effet, jet de sauvegarde…" data-k="'+P+'.degats" value="'+esc(a.degats)+'"></details>'}).join("")+
  '<button class="btn add" data-act="atknew">+ Action d\'attaque</button>'+
  '<h3 style="margin-top:16px">Passifs ajoutés automatiquement</h3><div class="hint" style="margin:-4px 0 8px">Ex : Colère du génie (+ maîtrise en foudre, 1 fois par tour), un objet qui donne +1 dégât, ou un simple rappel (Pourfendeur).</div>'+
  (c.passifs||[]).map((p,j)=>{const P="passifs."+j;return '<div class="atkcard"><div class="row"><input placeholder="Nom" data-k="'+P+'.label" value="'+esc(p.label)+'"><input style="width:60px" type="number" data-k="'+P+'.val" data-t="n" value="'+num(p.val)+'" title="Dégâts en plus (0 = simple rappel)"><button class="del" data-rm="'+P+'">✕</button></div>'+
    '<div class="grid g2" style="margin-top:6px"><div><label class="f">S\'applique à</label>'+sel(P+".applique",p.applique||"arme",APPL)+'</div><div><label class="f">Type de dégâts</label>'+typeSel(P+'.type',p.type)+'</div>'+
    '<div><label class="f">Seulement si dégâts</label>'+typeSel(P+'.siType',p.siType)+'</div><div style="display:flex;align-items:flex-end"><label class="row small"><input type="checkbox" class="tog" data-k="'+P+'.parTour" '+(p.parTour?"checked":"")+'> 1 fois par tour</label></div></div>'+
    '<input placeholder="Rappel affiché après l\'attaque (facultatif)" data-k="'+P+'.note" value="'+esc(p.note)+'" style="margin-top:6px"></div>'}).join("")+
  '<button class="btn add" data-push="passifs">+ Passif</button>'+
  (presetFor(c)?'<button class="btn pri" data-act="atkpreset" style="width:100%;margin-top:10px">⚔️ '+(c.presetV?"Mettre à jour":"Préremplir")+' les actions de '+esc(c.nom)+'</button>':'')+'</div>';
}
// Bouton « Attaquer » dans l'onglet Combat
function atkCalc(c){
  const tp=(c.passifs||[]).filter(p=>p.parTour&&num(p.val));
  const st=c.attaques.filter(isStruct);
  return (tp.length?'<div class="chips" style="margin-bottom:8px">'+tp.map(p=>{const used=state.eco["p_"+p.label];return '<button class="chip '+(used?"used":"on")+'" data-act="ptog" data-l="'+esc(p.label)+'">'+(used?"✓ ":"")+esc(p.label)+' +'+num(p.val)+(used?" (utilisé)":" dispo")+'</button>'}).join("")+'</div>':'')+
  turnBox()+(state.turnLog.length?'<button class="btn sm" data-act="tlreset" style="margin:-4px 0 8px">↺ Remettre le total du tour à zéro</button>':'')+
  (st.length?'<button class="btn pri bigatk" data-act="atkopen">⚔️ Attaquer</button>':'<div class="small mute">Configure tes actions d\'attaque dans l\'onglet Combat de ta fiche.</div>')+
  (presetFor(c)?'<button class="btn" data-act="atkpreset" style="width:100%;margin-top:8px">⚔️ '+(c.presetV?"Mettre à jour":"Préremplir")+' mes actions ('+esc(c.nom)+')</button>':'')+
  c.attaques.filter(a=>!isStruct(a)).map(a=>'<div class="atk"><b>'+esc(a.nom||"Attaque")+'</b><span>'+esc(a.bonus||"")+'</span><span class="mute">'+esc(a.degats||"")+'</span></div>').join("");
}
function passApplies(p,a){const ap=p.applique||"arme";return ap==="tout"||(ap==="arme"&&atkKind(a)==="arme")||(ap==="attaque"&&atkRoll(a))}
function attackModal(c,step,i){
  const m=document.querySelector(".modal.atkm")||(()=>{const x=modal("");x.classList.add("atkm");return x})();
  const box=m.querySelector(".box");
  const L=c.attaques.map((a,j)=>[a,j]).filter(([a])=>isStruct(a));
  if(step!=="dice"){
    const grp={arme:[],sort:[],autre:[]};L.forEach(([a,j])=>grp[atkKind(a)].push([a,j]));
    box.innerHTML='<h2>Quelle action ?</h2>'+turnBox()+Object.entries(grp).filter(([,v])=>v.length).map(([k,v])=>'<div class="catt">'+({arme:"Armes",sort:"Sorts",autre:"Capacités et invocations"})[k]+'</div>'+v.map(([a,j])=>{
      const r=a.cout&&c.ressources.find(x=>x.nom===a.cout);
      return '<button class="bib" data-pick="'+j+'"><div class="row"><b style="flex:1">'+esc(a.nom)+'</b>'+(a.main?'<span class="tag">'+MAINS[a.main]+'</span>':'')+(a.carac&&atkRoll(a)?'<span class="tag">'+sg(atkHit(c,a))+'</span>':'')+'</div><div class="small mute">'+esc((a.des||[]).map(d=>d.n+" "+(d.type||"")).join(" + "))+(r?' · coût : '+esc(r.nom)+' ('+num(r.act)+' restant)':'')+'</div></button>'}).join("")).join("")+
      '<div class="acts"><button class="btn" data-x>Fermer</button></div>';
    box.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>attackModal(c,"dice",+b.dataset.pick));
  }else{
    const a=c.attaques[i];const inp=state.atkIn[i]={};
    const ps=(a.sansPassifs?[]:(c.passifs||[])).filter(p=>passApplies(p,a)&&num(p.val));
    box.innerHTML='<h2>'+esc(a.nom)+'</h2>'+(a.carac&&atkRoll(a)?'<div class="small">Jet d\'attaque : <b>1d20 '+sg(atkHit(c,a))+'</b></div>':'')+(a.degats?'<div class="small mute">'+esc(a.degats)+'</div>':'')+
      '<div class="catt">Résultat de tes dés</div><div class="dice">'+(a.des||[]).map((d,j)=>'<label class="dl"><span>'+esc(d.n||"dé")+' '+esc(d.type||"")+'</span><input type="number" inputmode="numeric" placeholder="total" data-j="'+j+'" value="'+(inp[j]??"")+'"></label>').join("")+'</div>'+
      '<label class="row small" style="margin-top:8px"><input type="checkbox" class="tog" id="acrit" '+(inp.crit?"checked":"")+'> Coup critique (tu lances 2× les dés)</label>'+
      (ps.length?'<div class="catt">Bonus ajoutés</div>'+ps.map((p,k)=>{const used=p.parTour&&state.eco["p_"+p.label];return '<label class="row small" style="margin:4px 0"><input type="checkbox" class="tog" data-pk="'+k+'" '+(used?"":"checked")+'> '+esc(p.label)+' +'+num(p.val)+(p.type?' '+esc(p.type):'')+(p.parTour?(used?' <span class="mute">(déjà utilisé ce tour)</span>':' <span class="mute">(1×/tour)</span>'):'')+'</label>'}).join(""):'')+
      '<div id="ares"></div><div class="acts"><button class="btn" data-back>‹ Actions</button><button class="btn pri" data-go>Calculer</button></div>';
    box.querySelector("[data-back]").onclick=()=>attackModal(c,"list");
    box.querySelectorAll("[data-j]").forEach(e=>e.oninput=()=>{inp[e.dataset.j]=e.value});
    box.querySelector("#acrit").onchange=e=>{inp.crit=e.target.checked};
    let entry=null;
    box.querySelector("[data-go]").onclick=()=>{
      const on=new Set([...box.querySelectorAll("[data-pk]")].filter(e=>e.checked).map(e=>+e.dataset.pk));
      const r=computeAtk(c,i,ps.filter((p,k)=>on.has(k)),!entry);
      if(!entry){entry={nom:a.nom,total:r.total,types:r.types};state.turnLog.push(entry)}else{entry.total=r.total;entry.types=r.types}
      const other=a.main?c.attaques.findIndex(x=>isStruct(x)&&x.main&&x.main!==a.main&&atkKind(x)==="arme"):-1;
      box.querySelector("#ares").innerHTML=r.html+turnBox()+'<div class="row" style="margin-top:10px;flex-wrap:wrap">'+(other>=0?'<button class="btn pri" data-chain="'+other+'" style="flex:1">⚔️ Enchaîner : '+esc(c.attaques[other].nom)+'</button>':'')+'<button class="btn" data-more style="flex:1">+ Autre attaque</button></div>';
      const ch=box.querySelector("[data-chain]");if(ch)ch.onclick=()=>{state.atkIn[+ch.dataset.chain]={};attackModal(c,"dice",+ch.dataset.chain)};
      box.querySelector("[data-more]").onclick=()=>attackModal(c,"list");
      box.querySelector("[data-go]").textContent="Recalculer";rerenderPane();
    };

    const f=box.querySelector("[data-j]");if(f)setTimeout(()=>f.focus(),50);
  }
  const x=box.querySelector("[data-x]");if(x)x.onclick=()=>m.remove();
}
function computeAtk(c,i,ps,spend){
  const a=c.attaques[i];const inp=state.atkIn[i]||{};const lines=[];const byType={};const notes=[];
  const mainType=(a.des&&a.des[0]&&a.des[0].type)||"";
  const add=(label,v,type)=>{if(!v)return;lines.push([label,v,type||""]);const t=type||"(arme)";byType[t]=(byType[t]||0)+v};
  (a.des||[]).forEach((d,j)=>add("Dés "+(d.n||"")+(inp.crit?" (critique)":""),num(inp[j]),d.type||mainType));
  if(a.carac&&a.modDegats!==false)add(ABN[a.carac],mod(c.car[a.carac]),mainType);
  (a.fixe||[]).forEach(f=>add(f.label||"Bonus",num(f.val),f.type||mainType));
  ps.forEach(p=>{if(p.siType&&!byType[p.siType])return;add(p.label,num(p.val),p.type||mainType);if(p.parTour)state.eco["p_"+p.label]=true});
  (a.pct||[]).forEach(p=>{const t=p.type||mainType;const base=byType[t]||0;const b=Math.floor(base*num(p.val)/100);if(b){lines.push([p.label+" +"+num(p.val)+" %",b,t]);byType[t]=base+b}});
  (a.sansPassifs?[]:(c.passifs||[])).forEach(p=>{if(p.note&&passApplies(p,a)&&(!p.siType||byType[p.siType]))notes.push(p.note)});
  if(inp.crit)(c.passifs||[]).forEach(p=>{if(p.noteCrit&&passApplies(p,a))notes.push(p.noteCrit)});
  let coutTxt="";if(a.cout){const r=c.ressources.find(x=>x.nom===a.cout);if(r){if(!spend)coutTxt=a.cout+" : "+num(r.act)+" restant";else if(num(r.act)>0){r.act=num(r.act)-1;coutTxt=a.cout+" : "+r.act+" restant";schedule(c)}else coutTxt="⚠️ Plus de "+a.cout+" !"}}
  const total=Object.values(byType).reduce((s,v)=>s+v,0);
  return {total,types:byType,html:'<div class="atkres">'+lines.map(([l,v,t])=>'<div class="rl"><span>'+esc(l)+'</span><b>'+sg(v)+'</b><span class="mute">'+esc(t)+'</span></div>').join("")+
    '<div class="rt">Total : <b>'+total+'</b> dégâts</div><div class="small mute">'+Object.entries(byType).map(([t,v])=>v+" "+t).join(" · ")+'</div>'+
    (coutTxt?'<div class="small" style="margin-top:6px;color:var(--warn)">'+esc(coutTxt)+'</div>':'')+
    notes.map(n=>'<div class="small rem">📌 '+esc(n)+'</div>').join("")+'</div>'};
}
state.turnLog=[];
const turnTotal=()=>state.turnLog.reduce((s,e)=>s+e.total,0);
function turnBox(){if(!state.turnLog.length)return "";const t={};state.turnLog.forEach(e=>Object.entries(e.types).forEach(([k,v])=>t[k]=(t[k]||0)+v));
  return '<div class="turnbox"><div class="row"><span style="flex:1">Dégâts ce tour</span><b>'+turnTotal()+'</b></div><div class="small">'+state.turnLog.map(e=>esc(e.nom)+" "+e.total).join(" + ")+'</div><div class="small mute">'+Object.entries(t).map(([k,v])=>v+" "+k).join(" · ")+'</div></div>'}
// Préréglages connus
state.atkIn={};
const SEIKO_V=2;
function presetFor(c){return c.nom==="Seiko"&&num(c.presetV)<SEIKO_V?"seiko":""}
function applyPreset(c){
  if(presetFor(c)!=="seiko")return;
  const W={kind:"arme",carac:"dex",maitrise:true,modDegats:true,bonusToucher:0,jetAttaque:true,fixe:[],pct:[]};
  const S2=(nom,des,note,extra)=>Object.assign({nom,kind:"sort",carac:"",maitrise:false,modDegats:false,bonusToucher:0,jetAttaque:false,fixe:[],pct:[],des,degats:note},extra||{});
  c.attaques=[
    Object.assign({},W,{nom:"Kuroi Ventus",main:"D",des:[{n:"1d8",type:"tranchant"}],degats:"Katana ancestral. Dés à vérifier."}),
    Object.assign({},W,{nom:"Ruine",main:"G",des:[{n:"1d8",type:"tranchant"},{n:"1d8",type:"nécrotique"}],pct:[{label:"Ruine",val:10,type:"nécrotique"}],degats:"Avaleuse de vie +1d8 nécrotique. Ambidextre : bonus de Dex ajouté en main gauche."}),
    Object.assign({},W,{nom:"Écho : Libération incarnée",main:"",des:[{n:"1d8",type:"tranchant"}],cout:"Libération incarnée",degats:"Attaque de mêlée en plus de ton Écho quand tu fais l'action Attaquer. Copie l'arme équipée à l'invocation."}),
    Object.assign({},W,{nom:"Tempête nécrotique (Ruine)",kind:"autre",carac:"",jetAttaque:false,maitrise:false,modDegats:false,sansPassifs:true,des:[{n:"4d6",type:"nécrotique"}],pct:[{label:"Ruine",val:10,type:"nécrotique"}],cout:"Charges de Ruine",degats:"1 action, une cible en vue jusqu'à 9 m."}),
    S2("Contact glacial",[{n:"3d8",type:"nécrotique"}],"Tour de magie, attaque de sort au contact (36 m en 2014). La cible ne peut pas regagner de PV jusqu'à ton prochain tour. Version maison : à vérifier.",{jetAttaque:true,carac:"cha",maitrise:true}),
    S2("Vague tonnante (pacte niv 4)",[{n:"5d8",type:"tonnerre"}],"Cube de 4,5 m. JdS Con : repoussé de 3 m, moitié des dégâts si réussi."),
    S2("Fracassement (pacte niv 4)",[{n:"5d8",type:"tonnerre"}],"Sphère de 3 m à 18 m. JdS Con, moitié si réussi."),
    S2("Éclair (pacte niv 4)",[{n:"9d6",type:"foudre"}],"Ligne de 30 m sur 1,5 m. JdS Dex, moitié si réussi."),
    {nom:"Élémentaire de foudre : Écrasement",kind:"autre",carac:"",maitrise:false,modDegats:false,bonusToucher:0,jetAttaque:false,sansPassifs:true,des:[{n:"1d10",type:"foudre"}],fixe:[{label:"4 + niveau du sort (4)",val:8,type:"foudre"}],pct:[],degats:"Attaque de l'élémentaire (2 attaques par tour avec un emplacement de niveau 4)."}
  ];
  c.passifs=[
    {label:"Colère du génie",val:prof(c),type:"foudre",applique:"attaque",parTour:true,siType:"",note:""},
    {label:"Totem de force Brutus",val:1,type:"",applique:"arme",parTour:false,siType:"",note:""},
    {label:"Pourfendeur",val:0,type:"",applique:"arme",parTour:false,siType:"tranchant",note:"Pourfendeur : la cible perd 3 m de vitesse jusqu'au début de ton prochain tour.",noteCrit:"Pourfendeur (critique) : la cible a le désavantage à ses attaques jusqu'à ton prochain tour."}
  ];
  const R=(nom,max,reset)=>{const o=c.ressources.find(r=>r.nom===nom);if(o){o.max=max;o.reset=reset}else c.ressources.push({nom,act:max,max,reset})};
  c.ressources=c.ressources.filter(r=>!/Charges de la Lance/.test(r.nom));
  const old=c.ressources.find(r=>/^Charges de Ruine/.test(r.nom));if(old)old.nom="Charges de Ruine";
  R("Charges de Ruine",5,"Autre");R("Libération incarnée",Math.max(1,mod(c.car.con)),"Repos long");R("Fougue (action en plus)",1,"Repos court");
  R("Kuroi Ventus : arrêt du temps",Math.max(1,mod(c.car.sag)),"Repos long");R("Vol élémentaire (9 m, 10 min)",prof(c),"Repos long");R("Répit en bouteille",1,"Repos long");R("Charges de la Lance (si équipée)",4,"Autre");
  const D=(nom,desc)=>{if(!c.dons.some(d=>d.nom===nom))c.dons.push({nom,desc})};
  D("Combattant accompli","Immunisé contre la peur et le charme.");
  D("Attaques précises","Tu peux relancer une fois un dé de toucher qui fait 2 ou 3.");
  D("Senryaku ka","Tu choisis ton tour de passage en combat.");
  D("Ambidextre","Avec une arme dans chaque main, tu ajoutes ton bonus de dégâts à l'attaque en main gauche.");
  D("Duelliste","Une arme de mêlée dans une main et rien dans l'autre : +2 aux dégâts avec cette arme.");
  D("Kuroi Ventus (katana ancestral)","Action bonus ou réaction : tu arrêtes le temps pour tout ce qui est à 72 m. Tu gagnes 2 tours (1 minute hors combat). Une action hostile envers une créature rompt l'effet. Utilisations : bonus de mental (min. 1) par repos long.");
  D("Fougue","Une fois par repos court, une action en plus de ton action normale pendant ton tour.");
  D("Manifestation d'Écho","Action bonus : un Écho apparaît à 4 m (CA 14 + maîtrise = "+(14+prof(c))+", 1 PV, immunisé aux conditions). Il se déplace de 9 m sur ton ordre et disparaît au-delà de 9 m. Action bonus + 3 vitesses : échange de place. Tu peux attaquer depuis l'Écho, et il peut faire tes attaques d'opportunité. Il copie l'arme équipée à l'invocation.");
  D("Libération incarnée","Quand tu fais l'action Attaquer, une attaque de mêlée en plus avec ton Écho. Utilisations : bonus de Constitution par repos long.");
  D("Patron : Génie de la Foudre","Sorts de génie : Détection du mal et du bien, Vague tonnante (1) ; Force fantasmagorique, Fracassement (2) ; Création de nourriture et d'eau, Éclair (3) ; Assassin imaginaire, Convocation d'Élémentaire de Foudre (4) ; Création, Foulée dimensionnelle (5) ; Souhait (9).");
  D("Colère du génie","Une fois par tour, quand tu touches avec une attaque de mêlée, à distance ou de sort : + bonus de maîtrise ("+prof(c)+") dégâts de foudre.");
  D("Réceptacle du génie","Focaliseur. CA = DD de tes sorts, PV = niveau d'occultiste + maîtrise ("+(8+prof(c))+"). Immunisé poison et psychique. Répit en bouteille (action) : tu entres dans le réceptacle (cylindre de 6 m), jusqu'à 2 × maîtrise heures, sortie par action bonus. 1 fois par repos long.");
  D("Don élémentaire (niv 6)","Résistance aux dégâts de foudre. Action bonus : vol de 9 m pendant 10 minutes, bonus de maîtrise fois par repos long.");
  const ren=c.sorts.find(s=>/Invocation élémentaire de foudre/i.test(s.nom));
  const elemNote="Concentration jusqu'à 1 h, portée 27 m. Élémentaire : armure physique 0, armure magique 1 par niveau de sort, 50 PV (+10 par niveau au-dessus de 4), vitesse 12 m, vol plané 12 m. For 18, Dex 15, Con 17. Résiste au tonnerre, immunisé foudre et poison. Attaques = niveau du sort ÷ 2 ; Écrasement : 1d10 + 4 + niveau du sort en foudre. Il a sa propre initiative.";
  if(ren){ren.nom="Convocation d'Élémentaire de Foudre";ren.note=elemNote;ren.conc=true}
  else if(!c.sorts.some(s=>/Élémentaire de Foudre/i.test(s.nom)))c.sorts.push({niv:4,nom:"Convocation d'Élémentaire de Foudre",prep:true,conc:true,note:elemNote});
  if(!c.sorts.some(s=>/Fracassement/i.test(s.nom)))c.sorts.push({niv:2,nom:"Fracassement",prep:true,conc:false,note:"Sphère de 3 m à 18 m. JdS Con : 3d8 tonnerre, moitié si réussi. +1d8 par niveau au-dessus du 2e."});
  if(!c.sorts.some(s=>/Contact glacial/i.test(s.nom)))c.sorts.push({niv:0,nom:"Contact glacial",prep:true,conc:false,note:"Attaque de sort : 3d8 nécrotique au niveau 11. La cible ne regagne pas de PV jusqu'à ton prochain tour."});
  if(!num(c.pacte.max)){c.pacte={niv:4,max:2,used:0}}
  c.presetV=SEIKO_V;
}

// Animations d'ouverture des onglets
function tabAnim(kind){
  try{if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return}catch(e){}
  const d=document.createElement("div");d.className="tanim ta-"+kind;let dur=1700,html="";
  const rnd=(a,b)=>a+Math.random()*(b-a);
  if(kind==="persos"){
    const pages=Array.from({length:6},(_,i)=>'<div class="bk-leaf bk-page" style="--i:'+i+';z-index:'+(20-i)+'"><i></i><i></i><i></i><i></i><i></i></div>').join("");
    html='<div class="bk"><div class="bk-leaf bk-back" style="z-index:1"></div>'+pages+'<div class="bk-leaf bk-front" style="z-index:30"><span>⚔️</span></div></div>';dur=1900;
  }else if(kind==="mj"){
    const drops=Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return '<circle class="drop" r="'+rnd(3,6).toFixed(1)+'" style="--x:'+(Math.cos(a)*rnd(70,110)).toFixed(0)+'px;--y:'+(Math.sin(a)*rnd(70,110)).toFixed(0)+'px"/>'}).join("");
    html='<svg viewBox="-150 -110 300 220"><defs><clipPath id="eyeclip"><path class="lid" d="M-110 0 Q0 -78 110 0 Q0 78 -110 0Z"/></clipPath><radialGradient id="iris"><stop offset="0" stop-color="#0d0f14"/><stop offset=".28" stop-color="#0d0f14"/><stop offset=".32" stop-color="#7bd88f"/><stop offset=".75" stop-color="#2f8f5a"/><stop offset="1" stop-color="#123d27"/></radialGradient><radialGradient id="bub"><stop offset=".7" stop-color="#bfe8ff" stop-opacity="0"/><stop offset="1" stop-color="#bfe8ff" stop-opacity=".55"/></radialGradient></defs>'+
      '<g class="eye"><circle r="104" fill="url(#bub)" class="bubble"/><g clip-path="url(#eyeclip)"><rect x="-120" y="-80" width="240" height="160" fill="#f3efe6"/><g class="iris"><circle r="38" fill="url(#iris)"/><circle cx="-12" cy="-12" r="8" fill="#fff" opacity=".85"/></g></g>'+
      '<path class="lidline" d="M-110 0 Q0 -78 110 0 Q0 78 -110 0Z" fill="none" stroke="#1a1c22" stroke-width="5"/></g><circle class="popring" r="60" fill="none" stroke="#bfe8ff" stroke-width="4"/><g class="drops" fill="#bfe8ff">'+drops+'</g></svg>';dur=1650;
  }else if(kind==="biblio"){
    const emb=Array.from({length:16},()=>'<span class="ember" style="--x:'+rnd(-120,120).toFixed(0)+'px;--y:'+rnd(-220,-90).toFixed(0)+'px;--d:'+rnd(.9,1.3).toFixed(2)+'s;left:'+rnd(25,75).toFixed(0)+'%;top:'+rnd(35,65).toFixed(0)+'%"></span>').join("");
    html='<div class="scroll"><div class="roll top"></div><div class="paper"><div class="runes">ᚠ ᚱ ᚨ ᚷ ᛗ ᛟ<br>✶ ᛞ ᚹ ᛃ ✶<br>ᛉ ᛊ ᛏ ᛒ ᛖ</div><div class="burn"></div></div><div class="roll bot"></div><div class="fireball"></div>'+emb+'</div>';dur=1900;
  }else if(kind==="commun"){
    const coins=Array.from({length:18},(_,i)=>'<span class="coin" style="--x:'+rnd(-150,150).toFixed(0)+'px;--h:'+rnd(-260,-140).toFixed(0)+'px;--r:'+rnd(-540,540).toFixed(0)+'deg;animation-delay:'+(0.35+i*0.025).toFixed(2)+'s"></span>').join("");
    html='<div class="pouch"><svg viewBox="-80 -90 160 170"><defs><radialGradient id="leather" cx=".4" cy=".35"><stop offset="0" stop-color="#b07a45"/><stop offset="1" stop-color="#5e3a1c"/></radialGradient></defs>'+
      '<path d="M-58 20 C-70 70 70 70 58 20 C52 -10 26 -30 18 -38 L-18 -38 C-26 -30 -52 -10 -58 20Z" fill="url(#leather)" stroke="#3b2310" stroke-width="3"/>'+
      '<path d="M-22 -40 C-30 -60 -12 -70 0 -52 C12 -70 30 -60 22 -40Z" fill="#8a5a2f" stroke="#3b2310" stroke-width="3"/><rect x="-26" y="-44" width="52" height="9" rx="4" fill="#c9a24a" stroke="#6b5420" stroke-width="2"/>'+
      '<text x="0" y="38" text-anchor="middle" font-size="34" font-weight="800" fill="#f2d16b" stroke="#6b5420" stroke-width="1.5">PO</text></svg>'+coins+'</div>';dur=1900;
  }else return;
  d.innerHTML=html;document.body.appendChild(d);setTimeout(()=>d.remove(),dur);
}

// Animation des épées croisées
function swordsAnim(big){
  try{if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return}catch(e){}
  const bolt=(x0,y0,x1,y1,n,amp)=>{let d="M"+x0.toFixed(1)+" "+y0.toFixed(1);for(let i=1;i<n;i++){const t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,dx=-(y1-y0),dy=(x1-x0),L=Math.hypot(dx,dy)||1,o=(Math.random()*2-1)*amp;d+=" L"+(x+dx/L*o).toFixed(1)+" "+(y+dy/L*o).toFixed(1)}return d+" L"+x1.toFixed(1)+" "+y1.toFixed(1)};
  const kat=id=>'<g class="kat">'+
    '<path d="M-8 -6 C-10 -70 -5 -140 9 -200 L15 -196 C9 -140 8 -70 8 -6 Z" fill="url(#bk)" stroke="#7fa6d6" stroke-width="1.4" filter="url(#rim)"/>'+
    '<path d="M5 -8 C6 -70 7 -140 13 -194" fill="none" stroke="#cfe9ff" stroke-width="1.6" opacity=".8" class="hamon"/>'+
    '<path class="ev" id="'+id+'" fill="none" stroke="#bff0ff" stroke-width="2.2" filter="url(#gl)"/>'+
    '<rect x="-9" y="-10" width="18" height="7" rx="1.5" fill="#c9a24a"/>'+
    '<ellipse cx="0" cy="-1" rx="22" ry="6" fill="#15161b" stroke="#c9a24a" stroke-width="2"/>'+
    '<rect x="-7" y="4" width="14" height="60" rx="4" fill="#0b0b0e" stroke="#4a5266" stroke-width="1"/><rect x="-7" y="4" width="14" height="60" rx="4" fill="url(#ito)"/>'+
    '<rect x="-8" y="62" width="16" height="7" rx="2" fill="#c9a24a"/></g>';
  const d=document.createElement("div");d.className="swords"+(big?" swbig":"");
  d.innerHTML='<svg viewBox="-160 -170 320 320"><defs>'+
    '<linearGradient id="bk" x1="0" x2="1"><stop offset="0" stop-color="#060709"/><stop offset=".5" stop-color="#2a2f3c"/><stop offset=".62" stop-color="#11141b"/><stop offset="1" stop-color="#040506"/></linearGradient>'+
    '<pattern id="ito" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0L8 8M8 0L0 8" stroke="#3b4150" stroke-width="2"/></pattern>'+
    '<filter id="rim" x="-50%" y="-20%" width="200%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#3aa8ff" flood-opacity=".9"/></filter><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<radialGradient id="fl"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#bff0ff"/><stop offset="1" stop-color="#3aa8ff" stop-opacity="0"/></radialGradient></defs>'+
    '<g class="swl"><g transform="translate(0,100)">'+kat("evl")+'</g></g><g class="swr"><g transform="translate(0,100) scale(-1,1)">'+kat("evr")+'</g></g>'+
    '<g class="spark"><circle r="46" fill="url(#fl)"/><g class="bolts" stroke="#dff7ff" stroke-width="2.5" fill="none" filter="url(#gl)"></g></g></svg>'+(big?'<div class="swt">Au combat !</div>':'');
  document.body.appendChild(d);
  const evl=d.querySelector("#evl"),evr=d.querySelector("#evr"),bg=d.querySelector(".bolts");
  const tick=()=>{evl.setAttribute("d",bolt(2,-12,12,-192,14,4));evr.setAttribute("d",bolt(2,-12,12,-192,14,4));
    bg.innerHTML=Array.from({length:7},(_,i)=>{const a=i/7*Math.PI*2+Math.random()*.6,r=60+Math.random()*50;return '<path d="'+bolt(0,0,Math.cos(a)*r,Math.sin(a)*r,6,8)+'"/>'}).join("")};
  tick();const iv=setInterval(tick,70);
  if(big)setTimeout(()=>d.classList.add("shake"),450);
  setTimeout(()=>{clearInterval(iv);d.remove()},big?1800:1350);
  try{navigator.vibrate&&navigator.vibrate(big?[40,60,40]:30)}catch(e){}
}


// ---------- Sorts officiels (SRD 5.1 en français) ----------
let SRD=[];
function loadSRD(){if(SRD.length)return;fetch("sorts-srd.json").then(r=>r.json()).then(d=>{SRD=d;softRender()}).catch(()=>{})}
const getBib=id=>id&&id.startsWith("srd-")?SRD.find(s=>s.id===id):S.biblio.get(id);
const CLASSES_SORTS=["Barde","Clerc","Druide","Ensorceleur","Magicien","Occultiste","Paladin","Rôdeur"];
const myClasses=c=>c.classes.map(x=>x.nom).filter(n=>CLASSES_SORTS.includes(n));
function bibList(t,Q,niv,cls){
  Q=(Q||"").toLowerCase();
  return [...(t==="sort"?SRD:[]),...S.biblio.values()].filter(b=>b.type===t&&(!Q||(b.nom+" "+(b.classes||"")+" "+(b.ecole||"")).toLowerCase().includes(Q))&&(t!=="sort"||niv===""||niv==null||String(num(b.niv))===String(niv))&&(!cls||!cls.length||cls.some(k=>(b.classes||"").includes(k))))
    .sort((a,b)=>t==="sort"?(num(a.niv)-num(b.niv)||String(a.nom).localeCompare(b.nom)):String(a.nom).localeCompare(b.nom));
}
// Dés de dégâts d'un sort pour un personnage (tour de magie selon le niveau du perso, sinon niveau de base)
function sortDice(c,b,niv){
  const d=b.dmg;if(!d)return null;
  if(d.perso){const L=level(c);const k=Object.keys(d.perso).map(Number).filter(x=>x<=L).sort((x,y)=>y-x)[0];return d.perso[k||1]}
  if(d.slots){const n=niv||num(b.niv);return d.slots[n]||d.slots[Object.keys(d.slots)[0]]}
  return null;
}
function sortToAttack(c,b){
  const n=(num(c.pacte.max)&&num(c.pacte.niv)>num(b.niv)&&num(b.niv)>0)?num(c.pacte.niv):num(b.niv);
  const dice=sortDice(c,b,n);if(!dice)return null;
  const dd=8+prof(c)+mod(c.car[c.sortCar]);
  return {nom:b.nom+(num(b.niv)&&n!==num(b.niv)?" (niv "+n+")":""),kind:"sort",main:"",carac:b.attaque?c.sortCar:"",maitrise:true,modDegats:false,jetAttaque:!!b.attaque,bonusToucher:0,
    des:[{n:dice,type:b.dmg.type||""}],fixe:[],pct:[],degats:(b.jds?"JdS "+b.jds+" DD "+dd+". ":"")+(b.portee?b.portee+". ":"")+(b.dmg.perso?"Dés selon ton niveau.":"")};
}
function addSortToPerso(c,b,withAtk){
  c.sorts.push({niv:num(b.niv),nom:b.nom,prep:false,conc:!!b.conc,note:[b.temps,b.portee,b.duree,b.comp].filter(Boolean).join(" · ")+(b.desc?"\n"+b.desc:"")});
  let atk=false;if(withAtk&&b.dmg&&!c.attaques.some(a=>a.nom&&a.nom.startsWith(b.nom))){const a=sortToAttack(c,b);if(a){c.attaques.push(a);atk=true}}
  schedule(c);return atk;
}
function srdModal(b){
  const mine=persos().filter(c=>c.ownerId===myId);
  const m=modal('<h2>'+esc(b.nom)+'</h2><div class="small"><b>'+(num(b.niv)?"Niveau "+num(b.niv):"Tour de magie")+'</b> · '+esc(b.ecole)+(b.rituel?" · rituel":"")+'</div>'+
    '<div class="grid g2 small" style="margin:10px 0"><div><span class="mute">Incantation</span><br>'+esc(b.temps)+'</div><div><span class="mute">Portée</span><br>'+esc(b.portee)+'</div><div><span class="mute">Composantes</span><br>'+esc(b.comp)+'</div><div><span class="mute">Durée</span><br>'+esc(b.duree)+(b.conc?" (concentration)":"")+'</div></div>'+
    '<div class="small mute">Classes : '+esc(b.classes||"-")+'</div><div class="srddesc">'+esc(b.desc||"").replace(/\n/g,"<br>")+'</div>'+
    (mine.length&&!readOnly?'<div class="catt">Ajouter à ma fiche</div>'+(b.dmg?'<label class="row small" style="margin-bottom:6px"><input type="checkbox" class="tog" id="watk" checked> Créer aussi l\'action d\'attaque</label>':'')+mine.map(c=>'<button class="btn" data-add="'+c.id+'" style="width:100%;margin-bottom:6px">+ '+esc(c.nom)+'</button>').join(""):'')+
    '<div class="small mute" style="margin-top:8px">Source : SRD 5.1 (Wizards of the Coast), licence CC BY 4.0.</div><div class="acts"><button class="btn" data-x>Fermer</button></div>');
  m.querySelector("[data-x]").onclick=()=>m.remove();
  m.querySelectorAll("[data-add]").forEach(x=>x.onclick=()=>{const c=S.persos.get(x.dataset.add);if(!c)return;const w=m.querySelector("#watk");const atk=addSortToPerso(c,b,w&&w.checked);toast(b.nom+" ajouté à "+c.nom+(atk?" (et aux attaques)":""));m.remove()});
}

// ---------- Illustrations des cartes (scènes vectorielles, silhouette du perso) ----------
const ELC={foudre:["#7fd4ff","#0a1426","#2f6fae"],tonnerre:["#c9b8ff","#120f26","#5a4fa8"],feu:["#ffb347","#2a0b04","#e0621a"],froid:["#cff4ff","#0b2230","#4fb8d8"],
  "nécrotique":["#b48cff","#0c0814","#4b2d73"],radiant:["#fff1b0","#3a2a08","#e8c35a"],poison:["#c4ff8a","#0e1a08","#4f8a2a"],acide:["#c4ff8a","#0e1a08","#4f8a2a"],
  psychique:["#ffb3f5","#1e0b22","#a04fa8"],force:["#ffb3f5","#1e0b22","#a04fa8"],tranchant:["#e6eef8","#15181e","#5d6876"],perforant:["#e6eef8","#15181e","#5d6876"],
  contondant:["#e6eef8","#15181e","#5d6876"],passif:["#f2d16b","#1a150a","#8a7340"],capa:["#a8ffe8","#08201b","#2f8f7a"],arcane:["#d9c8ff","#140f26","#6b4fb8"]};
let ARTN=0;
// Silhouette du héros. style "samurai" (Seiko) ou "hood" (cape et capuche)
function hero(pose,style,col,opa){
  const S=style==="samurai";const f='fill="#07080b" stroke="'+col+'" stroke-width="1.2" stroke-linejoin="round"';const o=opa?' opacity="'+opa+'"':'';
  const head=S?'<circle cx="70" cy="40" r="7" '+f+'/><ellipse cx="65.5" cy="31.5" rx="3.2" ry="4.2" '+f+'/>':'<path d="M61 46 C59 34 66 28 72 30 C79 32 80 42 77 47 Z" '+f+'/>';
  const robe=S?'<path d="M64 48 C50 60 44 78 36 94 L56 88 L66 74 Z" '+f+'/>':'<path d="M63 47 C48 66 40 90 34 112 L60 104 L68 74 Z" '+f+'/>';
  if(pose==="slash")return '<g'+o+'>'+robe+'<path d="M68 72 L56 96 L44 122 L51 124 L63 100 L75 77 Z" '+f+'/><path d="M78 72 L96 95 L94 124 L101 124 L103 93 L85 69 Z" '+f+'/>'+
    '<path d="M64 47 L79 46 L86 71 L66 75 Z" '+f+'/><path d="M66 50 L52 61 L56 64 L69 56 Z" '+f+'/><path d="M76 48 L100 40 L102 46 L79 55 Z" '+f+'/>'+head+
    (S?'<path d="M60 70 L38 79" stroke="#07080b" stroke-width="3.5"/><path d="M60 70 L38 79" stroke="'+col+'" stroke-width=".8" opacity=".6"/>':'')+'</g>';
  if(pose==="cast")return '<g'+o+'>'+robe+'<path d="M68 72 L60 98 L56 124 L63 124 L68 100 L75 77 Z" '+f+'/><path d="M78 72 L90 96 L92 124 L99 124 L97 94 L85 70 Z" '+f+'/>'+
    '<path d="M64 47 L79 46 L84 71 L66 75 Z" '+f+'/><path d="M66 50 L54 64 L58 66 L69 56 Z" '+f+'/><path d="M77 48 L102 50 L103 56 L78 56 Z" '+f+'/><path d="M102 47 L109 45 L111 50 L109 56 L103 57 Z" '+f+'/>'+head+
    (S?'<path d="M60 70 L36 80" stroke="#07080b" stroke-width="3.5"/><path d="M62 72 L40 84" stroke="#07080b" stroke-width="3.5"/>':'')+'</g>';
  // garde
  return '<g'+o+'>'+robe+'<path d="M67 73 L64 98 L62 124 L69 124 L71 100 L74 77 Z" '+f+'/><path d="M77 73 L82 98 L84 124 L91 124 L88 96 L83 72 Z" '+f+'/>'+
    '<path d="M64 47 L79 46 L83 72 L66 75 Z" '+f+'/><path d="M66 50 L60 70 L64 71 L69 54 Z" '+f+'/><path d="M78 50 L84 66 L80 68 L75 54 Z" '+f+'/>'+head+
    (S?'<path d="M82 66 Q86 40 84 12" stroke="#07080b" stroke-width="3.5" fill="none"/><path d="M82 66 Q86 40 84 12" stroke="'+col+'" stroke-width="1" fill="none"/>':'<path d="M83 70 L86 14" stroke="#07080b" stroke-width="3.5"/><circle cx="86" cy="13" r="4" fill="'+col+'"/>')+'</g>';
}
const enemy=(col,x)=>'<g transform="translate('+(x||0)+',0)"><path d="M160 124 L164 96 L158 78 C156 66 166 58 172 62 C180 66 178 78 174 84 L178 98 L176 124 L171 124 L170 102 L166 102 L166 124 Z" fill="#0b0c10" stroke="'+col+'" stroke-width=".8" opacity=".95"/><circle cx="170" cy="66" r="1.4" fill="'+col+'"/><circle cx="174" cy="66" r="1.4" fill="'+col+'"/></g>';
const zig=(x0,y0,x1,y1,n,a,seed)=>{let r=seed||7,d="M"+x0+" "+y0;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280};for(let i=1;i<n;i++){const t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,dx=-(y1-y0),dy=x1-x0,L=Math.hypot(dx,dy)||1,o=(rnd()*2-1)*a;d+=" L"+(x+dx/L*o).toFixed(1)+" "+(y+dy/L*o).toFixed(1)}return d+" L"+x1+" "+y1};
function sceneOf(k){const n=nrm(k.nom);
  const has=(...w)=>w.some(x=>n.includes(x));
  if(has("kuroi")&&k.type!=="capacite")return "kuroi";if(has("ruine")&&!has("tempete"))return "ruine";if(has("tempete"))return "tempete";
  if(has("echo","liberation"))return "echo";if(has("fracassement"))return "fracas";if(has("eclair"))return "eclair";if(has("vague tonnante"))return "vague";
  if(has("contact glacial"))return "glacial";if(has("assassin"))return "assassin";if(has("fantasmagorique","illusion"))return "fantasme";if(has("elementaire de foudre","ecrasement"))return "elem";
  if(has("detection"))return "detect";if(has("nourriture"))return "food";if(has("hantise"))return "hantise";if(has("arret du temps","kuroi ventus"))return "temps";
  if(has("fougue"))return "fougue";if(has("vol ","don elementaire"))return "vol";if(has("bouteille","receptacle"))return "lampe";if(has("colere","genie"))return "genie";
  if(has("boule de feu","feu"))return "feu";if(k.type==="attaque")return "kuroi";if(k.type==="sort")return k.elem==="arcane"?"aura":"burst";return k.eco==="passif"?"garde":"aura"}
function sceneSVG(k){
  const c=S.persos.get(state._deckC)||{};const style=c.nom==="Seiko"||(c.classes||[]).some(x=>/guerrier|samoura|echo/i.test(x.nom+" "+x.sous))?"samurai":"hood";
  const sc=sceneOf(k);const E=ELC[k.elem]||ELC.arcane;const id="a"+(++ARTN);let col=E[0],fx="",pose="cast",back="";
  const glow='filter="url(#g'+id+')"';
  switch(sc){
    case "kuroi":col=ELC.foudre[0];pose="slash";fx='<path d="M101 44 Q126 22 154 5" stroke="#d6f4ff" stroke-width="3.2" fill="none" '+glow+'/><path d="'+zig(103,42,152,7,9,3,3)+'" stroke="#7fd4ff" stroke-width="1.4" fill="none" '+glow+'/>'+
      '<path d="M120 10 C170 20 182 70 160 112" stroke="#bff0ff" stroke-width="5" fill="none" opacity=".55" stroke-linecap="round" '+glow+'/>'+enemy(col,6);back=ELC.foudre;break;
    case "ruine":col=ELC["nécrotique"][0];pose="slash";fx='<path d="M101 44 Q126 22 154 5" stroke="#e4d4ff" stroke-width="3.2" fill="none" '+glow+'/><path d="M118 12 C168 22 180 72 158 114" stroke="#9b6bff" stroke-width="6" fill="none" opacity=".55" stroke-linecap="round" '+glow+'/>'+
      [0,1,2,3,4].map(i=>'<circle cx="'+(150+i*7)+'" cy="'+(40+i*14)+'" r="'+(2+i%2)+'" fill="#5fd38a" opacity=".7" '+glow+'/>').join("")+enemy(col,6);back=ELC["nécrotique"];break;
    case "echo":col=ELC.foudre[0];pose="slash";back=ELC.arcane;fx='<g transform="translate(46,-4)" opacity=".38">'+hero("slash",style,"#d9c8ff")+'<path d="M101 44 Q126 22 154 5" stroke="#d9c8ff" stroke-width="3" fill="none"/></g><path d="M101 44 Q126 22 150 7" stroke="#d6f4ff" stroke-width="3" fill="none" '+glow+'/>';break;
    case "tempete":col=ELC["nécrotique"][0];back=ELC["nécrotique"];fx=[0,1,2,3].map(i=>'<ellipse cx="160" cy="'+(70+i*4)+'" rx="'+(30-i*6)+'" ry="'+(42-i*9)+'" fill="none" stroke="'+(i%2?"#5fd38a":"#9b6bff")+'" stroke-width="'+(2.5-i*.4)+'" transform="rotate('+(i*25)+' 160 72)" '+glow+'/>').join("")+'<path d="M110 52 C130 44 140 58 150 62" stroke="#b48cff" stroke-width="2" fill="none" '+glow+'/>'+enemy(col,-2);break;
    case "eclair":col=ELC.foudre[0];back=ELC.foudre;fx='<path d="'+zig(110,52,198,40,12,7,11)+'" stroke="#fff" stroke-width="3" fill="none" '+glow+'/><path d="'+zig(110,52,198,44,10,10,5)+'" stroke="#7fd4ff" stroke-width="1.6" fill="none" '+glow+'/>';break;
    case "fracas":col=ELC.tonnerre[0];back=ELC.tonnerre;fx=[14,24,34,44].map((r,i)=>'<circle cx="160" cy="80" r="'+r+'" fill="none" stroke="#e0d6ff" stroke-width="'+(3-i*.6)+'" opacity="'+(1-i*.2)+'" '+glow+'/>').join("")+'<path d="M160 80 L150 60 M160 80 L178 66 M160 80 L170 100 M160 80 L144 92" stroke="#fff" stroke-width="1.4" '+glow+'/>'+enemy(col,-4);break;
    case "vague":col=ELC.tonnerre[0];back=ELC.tonnerre;fx=[0,1,2].map(i=>'<rect x="'+(100+i*14)+'" y="'+(30-i*8)+'" width="'+(30+i*18)+'" height="'+(80+i*16)+'" rx="4" fill="none" stroke="#c9b8ff" stroke-width="'+(3-i*.7)+'" opacity="'+(1-i*.25)+'" '+glow+'/>').join("")+enemy(col,14);break;
    case "glacial":col=ELC["nécrotique"][0];back=ELC.froid;fx='<path d="M150 112 L150 82 M150 82 L142 64 M150 82 L148 60 M150 82 L156 61 M150 82 L162 66 M150 82 L168 78" stroke="#cff4ff" stroke-width="3" stroke-linecap="round" '+glow+'/><path d="M110 52 C126 50 136 62 146 74" stroke="#cff4ff" stroke-width="1.5" fill="none" stroke-dasharray="3 3" '+glow+'/>'+enemy("#cff4ff",10);break;
    case "assassin":col=ELC.psychique[0];back=ELC.psychique;fx='<path d="M170 20 C150 30 150 70 158 120 L190 120 C196 70 192 30 170 20Z" fill="#ffb3f5" opacity=".22" '+glow+'/><circle cx="165" cy="40" r="2.5" fill="#fff"/><circle cx="175" cy="40" r="2.5" fill="#fff"/>'+enemy(col,-8);break;
    case "fantasme":col=ELC.psychique[0];back=ELC.psychique;fx=[0,1,2].map(i=>'<path d="M'+(150+i*6)+' 60 C'+(130+i*8)+' 40 '+(190-i*4)+' 30 '+(170-i*3)+' '+(56-i*4)+'" stroke="#ffb3f5" stroke-width="1.6" fill="none" '+glow+'/>').join("")+enemy(col,0);break;
    case "elem":col=ELC.foudre[0];back=ELC.foudre;fx='<path d="M150 124 L156 94 L148 80 C146 62 158 52 166 56 C176 60 176 74 170 82 L178 96 L174 124 Z" fill="#7fd4ff" opacity=".28" '+glow+'/><path d="'+zig(150,120,160,58,8,5,2)+'M'+zig(172,120,164,60,8,5,9).slice(1)+'" stroke="#e6f8ff" stroke-width="1.4" fill="none" '+glow+'/>';break;
    case "detect":col=ELC.radiant[0];back=ELC.radiant;pose="garde";fx='<ellipse cx="72" cy="78" rx="44" ry="56" fill="none" stroke="#fff1b0" stroke-width="1.5" stroke-dasharray="4 4" '+glow+'/><path d="M136 60 Q156 44 176 60 Q156 76 136 60Z" fill="none" stroke="#fff1b0" stroke-width="2" '+glow+'/><circle cx="156" cy="60" r="5" fill="#fff1b0"/>';break;
    case "food":col=ELC.radiant[0];back=ELC.capa;fx='<ellipse cx="150" cy="96" rx="22" ry="11" fill="#c08a4a" stroke="#fff1b0" stroke-width="1.2" '+glow+'/><path d="M172 64 L188 64 L184 100 L176 100 Z" fill="#6cb6ff" opacity=".7" stroke="#cff4ff" '+glow+'/>';break;
    case "hantise":col=ELC["nécrotique"][0];back=ELC["nécrotique"];fx=[0,1,2].map(i=>'<path d="M'+(140+i*16)+' 110 C'+(130+i*16)+' 80 '+(160+i*16)+' 70 '+(146+i*16)+' 40" stroke="#b48cff" stroke-width="2" fill="none" opacity=".7" '+glow+'/>').join("");break;
    case "temps":col=ELC.foudre[0];back=ELC.arcane;pose="garde";fx='<circle cx="72" cy="70" r="52" fill="none" stroke="#d9c8ff" stroke-width="2" '+glow+'/>'+Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return '<path d="M'+(72+Math.cos(a)*46).toFixed(1)+' '+(70+Math.sin(a)*46).toFixed(1)+' L'+(72+Math.cos(a)*52).toFixed(1)+' '+(70+Math.sin(a)*52).toFixed(1)+'" stroke="#d9c8ff" stroke-width="2"/>'}).join("")+'<path d="M72 70 L72 34 M72 70 L96 80" stroke="#fff" stroke-width="2.5" '+glow+'/>'+enemy("#d9c8ff",4).replace('opacity=".95"','opacity=".4"');break;
    case "fougue":col=ELC.feu[0];back=ELC.feu;pose="slash";fx=[0,1,2,3,4].map(i=>'<path d="M'+(10+i*4)+' '+(50+i*12)+' L'+(46+i*2)+' '+(50+i*12)+'" stroke="#ffb347" stroke-width="2" opacity=".7" '+glow+'/>').join("")+'<path d="M101 44 Q126 22 154 5" stroke="#ffe0b0" stroke-width="3" fill="none" '+glow+'/>';break;
    case "vol":col=ELC.foudre[0];back=ELC.foudre;pose="garde";fx='<path d="M64 52 C30 30 18 40 8 26 C28 58 40 64 62 62Z M80 52 C114 30 126 40 136 26 C116 58 104 64 82 62Z" fill="#7fd4ff" opacity=".35" '+glow+'/><path d="'+zig(56,128,88,128,8,3,4)+'" stroke="#7fd4ff" stroke-width="1.5" fill="none" '+glow+'/>';break;
    case "lampe":col=ELC.capa[0];back=ELC.capa;pose="garde";fx='<path d="M136 104 C136 92 172 92 172 104 L180 104 C186 96 194 100 188 108 L176 112 C168 118 140 118 136 112Z" fill="#c9a24a" stroke="#fff1b0" stroke-width="1.2" '+glow+'/><path d="M156 92 C150 70 170 60 160 30" stroke="#a8ffe8" stroke-width="3" fill="none" opacity=".7" '+glow+'/>';break;
    case "genie":col=ELC.foudre[0];back=ELC.foudre;pose="garde";fx='<path d="M150 112 C140 90 170 80 156 60 C150 46 162 30 176 34 C190 38 190 56 178 62 C170 70 186 92 168 112Z" fill="#7fd4ff" opacity=".3" '+glow+'/><circle cx="170" cy="46" r="2.5" fill="#fff"/><circle cx="180" cy="46" r="2.5" fill="#fff"/><path d="'+zig(160,30,150,4,5,4,6)+'" stroke="#fff" stroke-width="1.5" fill="none" '+glow+'/>';break;
    case "feu":col=ELC.feu[0];back=ELC.feu;fx='<circle cx="160" cy="76" r="30" fill="#ff7a1a" opacity=".5" '+glow+'/><circle cx="160" cy="76" r="18" fill="#ffd34d" '+glow+'/><path d="M110 52 C130 50 140 62 146 68" stroke="#ffb347" stroke-width="3" fill="none" '+glow+'/>';break;
    case "burst":back=E;fx='<circle cx="160" cy="76" r="26" fill="'+E[0]+'" opacity=".35" '+glow+'/><circle cx="160" cy="76" r="12" fill="'+E[0]+'" '+glow+'/><path d="M110 52 C130 50 140 62 148 70" stroke="'+E[0]+'" stroke-width="2.5" fill="none" '+glow+'/>'+enemy(E[0],8);break;
    case "garde":pose="garde";back=ELC.passif;col=ELC.passif[0];fx='<path d="M150 40 L176 48 L176 76 C176 96 162 108 150 114 C138 108 124 96 124 76 L124 48Z" fill="none" stroke="#f2d16b" stroke-width="2.5" '+glow+'/>';break;
    default:pose="garde";back=E;fx='<ellipse cx="72" cy="80" rx="40" ry="54" fill="none" stroke="'+E[0]+'" stroke-width="2" '+glow+'/>';
  }
  back=back||E;
  return '<svg class="scene" viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="b'+id+'" cx=".55" cy=".45" r=".8"><stop offset="0" stop-color="'+back[2]+'"/><stop offset="1" stop-color="'+back[1]+'"/></radialGradient>'+
    '<filter id="g'+id+'" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
    '<rect width="200" height="140" fill="url(#b'+id+')"/><path d="M0 128 L200 124 L200 140 L0 140Z" fill="#000" opacity=".55"/><path d="M0 104 L40 84 L70 96 L110 74 L150 92 L200 70 L200 126 L0 130Z" fill="#000" opacity=".22"/>'+
    '<g transform="translate(16,0)">'+hero(pose,style,col)+fx+'</g></svg>';
}

// ---------- Deck de cartes (attaques, sorts, capacités) ----------
state.played={};state.deckF="tout";
const ECOL={action:"Action",bonus:"Bonus",reac:"Réaction",passif:"Passif",libre:"Libre"};
const TYPICON={tranchant:"🗡️",perforant:"🏹",contondant:"🔨",nécrotique:"💀",radiant:"☀️",feu:"🔥",froid:"❄️",foudre:"⚡",tonnerre:"💥",poison:"☠️",acide:"🧪",force:"✴️",psychique:"🌀",vitalité:"❤️"};
const nrm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
function ecoOf(txt,def){const t=nrm(txt);
  if(/action bonus|bonus action/.test(t))return "bonus";
  if(/reaction/.test(t))return "reac";
  if(/(^|[^a-z])(1 action|une action|pour une action|action :|action d'attaque|\(action\))/.test(t))return "action";
  return def||"passif"}
function linkRes(c,nom){const n=nrm(nom);return c.ressources.find(r=>{const rn=nrm(r.nom);return rn&&(rn.includes(n)||n.includes(rn.split(" (")[0])||rn.split(/[^a-z]+/).filter(w=>w.length>5).some(w=>n.includes(w)))})}
function deckCards(c){
  const cards=[];const used=new Set();
  c.sorts.forEach((s,i)=>{
    const ai=c.attaques.findIndex(a=>isStruct(a)&&a.nom&&nrm(a.nom).startsWith(nrm(s.nom)));if(ai>=0)used.add(ai);
    const a=ai>=0?c.attaques[ai]:null;const dmg=a&&a.des&&a.des[0];
    cards.push({elem:dmg?dmg.type:"arcane",medal:num(s.niv)?String(num(s.niv)):"T",flavor:(s.note||"").split("\n").pop().slice(0,110),key:"sort:"+s.nom,type:"sort",nom:s.nom,icon:dmg?(TYPICON[dmg.type]||"✨"):"✨",eco:ecoOf(s.note,"action"),
      sub:(num(s.niv)?"Niveau "+num(s.niv):"Tour de magie")+(dmg?" · "+(a.des||[]).map(d=>d.n+" "+(d.type||"")).join(" + "):""),
      tags:[s.conc?"Concentration":"",a&&a.jetAttaque?"Jet d'attaque":"",(a&&a.degats||"").match(/JdS \w+ DD \d+/)?(a.degats.match(/JdS \w+ DD \d+/)[0]):""].filter(Boolean),
      cost:num(s.niv)?"Emplacement niv "+num(s.niv)+"+":"Gratuit",desc:s.note||"",play:()=>castSpell(c,i,()=>{if(ai>=0)attackModal(c,"dice",ai)})})});
  c.attaques.forEach((a,i)=>{if(!isStruct(a)||used.has(i))return;const r=a.cout&&c.ressources.find(x=>x.nom===a.cout);const dmg=a.des&&a.des[0];
    cards.push({elem:dmg?dmg.type:"tranchant",medal:a.carac&&atkRoll(a)?sg(atkHit(c,a)):(dmg?dmg.n:"-"),flavor:a.degats||"",key:"atk:"+a.nom,type:atkKind(a)==="sort"?"sort":"attaque",nom:a.nom,icon:atkKind(a)==="arme"?"⚔️":(dmg&&TYPICON[dmg.type])||"🌀",
      eco:atkKind(a)==="arme"?"action":ecoOf(a.degats,"action"),sub:(a.des||[]).map(d=>d.n+" "+(d.type||"")).join(" + ")+(a.carac&&atkRoll(a)?" · "+sg(atkHit(c,a))+" toucher":""),
      tags:[a.main?MAINS[a.main]:""].filter(Boolean),cost:r?r.nom+" : "+num(r.act)+"/"+num(r.max):"",empty:r&&num(r.act)<=0,desc:a.degats||"",play:()=>attackModal(c,"dice",i)})});
  c.dons.forEach((d,i)=>{const e=ecoOf(d.desc,"passif");const r=e!=="passif"?linkRes(c,d.nom):null;
    cards.push({elem:e==="passif"?"passif":"capa",medal:r?String(num(r.act)):(e==="passif"?"∞":"•"),flavor:(d.desc||"").slice(0,110),key:"cap:"+d.nom,type:"capacite",nom:d.nom,icon:e==="passif"?"🛡️":"🌀",eco:e,sub:r?r.nom+" : "+num(r.act)+"/"+num(r.max):(e==="passif"?"Effet permanent":""),
      tags:[],cost:r?"1 utilisation":"",empty:r&&num(r.act)<=0,desc:d.desc||"",play:e==="passif"?null:()=>{if(r){if(num(r.act)<=0){toast("Plus d'utilisation pour "+r.nom);return}r.act=num(r.act)-1;schedule(c)}toast(d.nom+" utilisé"+(r?" ("+r.act+" restant)":""));rerenderPane()}})});
  return cards;
}
const ECOI={action:"⚔",bonus:"✦",reac:"↺",passif:"◈",libre:"•"};
const TYPEL={attaque:"Attaque",sort:"Sort",capacite:"Capacité"};
// Illustrations fournies par les joueurs (perso | début du nom de carte | type)
const CARD_IMGS=[["seiko","kuroi ventus","attaque","img/seiko/kuroi-ventus.jpg"],["seiko","fracassement",null,"img/seiko/fracassement.jpg"],["seiko","echo",null,"img/seiko/echo.jpg"],["seiko","manifestation",null,"img/seiko/echo.jpg"]];
function cardImg(k){const c=S.persos.get(state._deckC)||{};const pn=nrm(c.nom),kn=nrm(k.nom);const f=CARD_IMGS.find(([p,n,t])=>p===pn&&kn.startsWith(n)&&(!t||t===k.type));return f&&f[3]}
function artHtml(k){const im=cardImg(k);return '<div class="art el-'+nrm(k.elem).replace(/[^a-z]/g,"")+(im?' hasimg':'')+'">'+(im?'<img class="artimg" src="'+im+'" alt="" loading="lazy">':sceneSVG(k))+'<div class="artico mini">'+k.icon+'</div></div>'}
function cardHtml(k,small){const fav=(state._favs||[]).includes(k.key);const pl=state.played[k.key];
  return '<button class="card4 t-'+k.type+(small?" sm":"")+(pl?" played":"")+(k.empty?" empty":"")+'" data-act="cardopen" data-key="'+esc(k.key)+'">'+
    artHtml(k)+'<div class="ribbon"><div class="medal">'+esc(k.medal)+'</div><div class="ecoic e-'+k.eco+'" title="'+ECOL[k.eco]+'">'+ECOI[k.eco]+'</div></div>'+
    (fav?'<div class="favst">★</div>':'')+
    '<div class="parch"><div class="ptitle">'+esc(k.nom)+'</div><div class="psub">'+esc(k.sub||ECOL[k.eco])+'</div></div>'+
    '<div class="cfoot"><span>'+TYPEL[k.type]+'</span><span>'+ECOL[k.eco]+'</span></div>'+(pl?'<div class="c3pl">Jouée</div>':'')+'</button>'}
function deckHtml(c){
  const cards=deckCards(c);state._favs=c.favs||[];state._deck=cards;state._deckC=c.id;
  const favs=cards.filter(k=>state._favs.includes(k.key));
  const F=state.deckF;const list=cards.filter(k=>F==="tout"||k.type===F||(F==="dispo"&&k.eco!=="passif"&&!state.played[k.key]&&!k.empty));
  const cnt=t=>cards.filter(k=>k.type===t).length;
  return '<div class="catt">🃏 Ma main (favoris)</div>'+(favs.length?'<div class="hand">'+favs.map(k=>cardHtml(k,false)).join("")+'</div>':'<div class="small mute">Touche une carte puis ☆ pour l\'épingler ici : tu la retrouveras tout de suite au round 1.</div>')+
    '<div class="catt">Mon deck</div><div class="seg deckseg">'+[["tout","Tout ("+cards.length+")"],["attaque","⚔️ "+cnt("attaque")],["sort","✨ "+cnt("sort")],["capacite","🌀 "+cnt("capacite")],["dispo","Dispo"]].map(([k,l])=>'<button data-act="deckf" data-f="'+k+'" class="'+(F===k?"on":"")+'">'+l+'</button>').join("")+'</div>'+
    '<div class="deck">'+list.map(k=>cardHtml(k,true)).join("")+'</div>';
}
function cardModal(c,key){
  const k=(state._deck||deckCards(c)).find(x=>x.key===key);if(!k)return;const fav=(c.favs||[]).includes(key);
  const m=modal('<div class="card4 bigc t-'+k.type+'">'+artHtml(k)+'<div class="ribbon"><div class="medal">'+esc(k.medal)+'</div><div class="ecoic e-'+k.eco+'">'+ECOI[k.eco]+'</div></div>'+
    '<div class="parch"><div class="ptitle">'+esc(k.nom)+'</div><div class="psub">'+esc(k.sub||"")+'</div>'+
    (k.tags.length||k.cost?'<div class="ptags">'+k.tags.concat(k.cost?["Coût : "+k.cost]:[]).map(t=>'<span>'+esc(t)+'</span>').join("")+'</div>':'')+
    '<div class="pdesc">'+(esc(k.desc)||'<i>Pas de description.</i>').replace(/\n/g,"<br>")+'</div></div>'+
    '<div class="cfoot"><span>'+TYPEL[k.type]+'</span><span>'+ECOL[k.eco]+'</span></div></div>'+
    '<div class="acts"><button class="btn" data-fav>'+(fav?"★ Retirer de ma main":"☆ Mettre dans ma main")+'</button><button class="btn" data-x>Fermer</button>'+(k.play&&!readOnly?'<button class="btn pri" data-play'+(k.empty?" disabled":"")+'>'+(k.empty?"Épuisée":"Jouer")+'</button>':'')+'</div>');
  m.classList.add("cardm");
  m.querySelector("[data-x]").onclick=()=>m.remove();
  m.querySelector("[data-fav]").onclick=()=>{c.favs=c.favs||[];if(fav)c.favs=c.favs.filter(x=>x!==key);else c.favs.push(key);schedule(c);m.remove();rerenderPane()};
  const p=m.querySelector("[data-play]");if(p)p.onclick=()=>{m.remove();state.played[key]=true;if(k.eco==="action"&&k.type!=="attaque")state.eco.action=true;if(k.eco==="bonus")state.eco.bonus=true;if(k.eco==="reac")state.eco.reac=true;k.play();rerenderPane()};
}

// ---------- Combat ----------
const FULLC=["Barde","Clerc","Druide","Ensorceleur","Magicien"],HALFC=["Paladin","Rôdeur"];
const SLOTTBL={1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],9:[4,3,3,3,1],10:[4,3,3,3,2],11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],13:[4,3,3,3,2,1,1],14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],17:[4,3,3,3,2,1,1,1,1],18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]};
const PACTN=[0,1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4],PACTL=[0,1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5];
// Emplacements selon les règles D&D 5e (multiclasse comprise)
function calcSlots(c){
  const cls=c.classes.filter(x=>x.nom);
  const third=x=>["Guerrier","Roublard"].includes(x.nom)&&/occulte|arcanique|eldritch|trickster/i.test(x.sous||"");
  const casters=cls.filter(x=>FULLC.includes(x.nom)||HALFC.includes(x.nom)||x.nom==="Artificier"||third(x));
  const multi=casters.length>1;let lvl=0;
  casters.forEach(x=>{const n=num(x.niv);
    if(FULLC.includes(x.nom))lvl+=n;
    else if(x.nom==="Artificier")lvl+=Math.ceil(n/2);
    else if(HALFC.includes(x.nom))lvl+=multi?Math.floor(n/2):(n>=2?Math.ceil(n/2):0);
    else lvl+=multi?Math.floor(n/3):(n>=3?Math.ceil(n/3):0)});
  const slots=SLOTTBL[Math.min(20,lvl)]||[];
  const w=cls.find(x=>x.nom==="Occultiste");let pacte=null;
  if(w){const n=clamp(num(w.niv),0,20);pacte={niv:PACTL[n],max:PACTN[n]}}
  return {slots,pacte,lvl};
}
function slotText(r){const p=[];if(r.slots.length)p.push(r.slots.map((n,i)=>n+" × niv "+(i+1)).join(", "));if(r.pacte)p.push("pacte : "+r.pacte.max+" × niv "+r.pacte.niv);return p.join(" ; ")||"aucun emplacement (classe sans sorts)"}
function applySlots(c){const r=calcSlots(c);c.slots=c.slots.map((s,i)=>{const m=r.slots[i]||0;return{max:m,used:Math.min(num(s.used),m)}});if(r.pacte)c.pacte={niv:r.pacte.niv,max:r.pacte.max,used:Math.min(num(c.pacte.used),r.pacte.max)};return r}

const ECO=[["action","Action"],["bonus","Action bonus"],["reac","Réaction"],["mouv","Mouvement"]];
state.eco={};state.sopen={};let lastTour=null;
function lignesTriees(cb){return Object.entries(cb.lignes||{}).map(([id,l])=>Object.assign({id},l)).sort((a,b)=>{const ai=a.init===""||a.init==null?-999:num(a.init),bi=b.init===""||b.init==null?-999:num(b.init);return bi-ai||String(a.nom).localeCompare(b.nom)})}
function cbUpdate(fields){const k="groupe/combat";lsSave();if(!remote)return;enqueue(k,()=>fs.updateDoc(ref("groupe","combat"),fields))}
const cbTimers={};
function combatPane(){
  const cb=G.combat||GDEF().combat;
  const mine=persos().filter(c=>c.ownerId===myId&&!c.retire);
  if(!state.cbPerso||!S.persos.get(state.cbPerso)||S.persos.get(state.cbPerso).ownerId!==myId)state.cbPerso=(mine[0]||{}).id||"";
  let h="";
  if(!cb.actif){
    h+='<div class="card"><h3>Combat</h3><p class="small mute" style="margin-top:0">Lance un combat pour suivre l\'initiative de tout le groupe en direct. Chaque joueur entre son initiative (ou lance le dé), le MJ ajoute les monstres.</p>'+(readOnly?'':'<button class="btn pri" data-act="cbstart" style="width:100%;padding:12px">⚔️ Lancer un combat</button>')+'</div>';
  }else{
    const L=lignesTriees(cb);
    h+='<div class="card"><div class="row"><h3 style="flex:1;margin:0">Round '+num(cb.round||1)+'</h3><button class="btn sm" data-act="cbend">Terminer le combat</button></div><div class="ini">'+
      L.map(l=>{const on=l.id===cb.tour;const p=l.persoId&&S.persos.get(l.persoId);const ed=!readOnly&&(!l.persoId||canEdit(p));
        return '<div class="inil'+(on?' on':'')+'"><span class="arrow">'+(on?'▶':'')+'</span>'+(p?avatar(p,30):'<div class="av" style="width:30px;height:30px;font-size:14px">👹</div>')+
        '<div class="grow"><b>'+esc(l.nom||"?")+'</b>'+(p?'<div class="small mute">PV '+p.pv.act+'/'+p.pv.max+' · CA '+p.ca+(p.etats.length?' · <span style="color:var(--warn)">'+esc(p.etats.join(", "))+'</span>':'')+'</div>':
          '<div class="small mute row" style="gap:4px">PV <input class="mini-in" type="number" data-cpv="'+l.id+'" value="'+num(l.pv)+'"> / <input class="mini-in" type="number" data-cpvmax="'+l.id+'" value="'+num(l.pvmax)+'"></div>')+'</div>'+
        '<input class="ini-in" type="number" inputmode="numeric" placeholder="Init" data-cinit="'+l.id+'" value="'+(l.init===""||l.init==null?"":l.init)+'" '+(ed?"":"disabled")+'>'+
        (p&&ed?'<button class="ico" data-act="cbroll" data-line="'+l.id+'" title="Lancer 1d20 + initiative">🎲</button>':'')+
        (!l.persoId&&!readOnly?'<button class="del" data-act="cbdel" data-line="'+l.id+'">✕</button>':'')+'</div>'}).join("")+'</div>'+
      (readOnly?'':'<div class="row" style="margin-top:10px"><button class="btn" data-act="cbaddpnj" style="flex:1">+ Monstre / PNJ</button><button class="btn pri" data-act="cbnext" style="flex:1">Tour suivant ▶</button></div>')+'</div>';
    // Remise à zéro des actions quand c'est mon tour
    const tl=(cb.lignes||{})[cb.tour];
    if(cb.tour!==lastTour){if(tl&&tl.persoId===state.cbPerso){state.eco={};state.turnLog=[];state.played={}}lastTour=cb.tour}
  }
  if(!mine.length)h+='<div class="card"><p class="small mute" style="margin:0">Ouvre ta fiche et touche « C\'est mon perso » pour avoir ton panneau de combat ici.</p></div>';
  else{const c=S.persos.get(state.cbPerso);state.cur=c.id;
    if(mine.length>1)h+='<div class="seg">'+mine.map(m=>'<button data-act="cbperso" data-id="'+m.id+'" class="'+(m.id===c.id?"on":"")+'">'+esc(m.nom)+'</button>').join("")+'</div>';
    h+=combatSheet(c)}
  return h;
}
function combatSheet(c){
  const r=calcSlots(c);const noSlots=!c.slots.some(s=>num(s.max))&&!num(c.pacte.max);const canCalc=r.slots.length||r.pacte;
  const slotRows=c.slots.map((s,i)=>num(s.max)?'<div class="slot"><b>Niv '+(i+1)+'</b><span class="small mute">'+Math.max(0,num(s.max)-num(s.used))+' / '+num(s.max)+'</span><div class="pips">'+Array.from({length:num(s.max)},(_,j)=>'<button class="pip vio '+(s.used>j?"on":"")+'" data-slot="'+i+'" data-v="'+(j+1)+'"></button>').join("")+'</div></div>':'').join("")+
    (num(c.pacte.max)?'<div class="slot"><b>Pacte</b><span class="small mute">niv '+num(c.pacte.niv)+' · '+Math.max(0,num(c.pacte.max)-num(c.pacte.used))+' / '+num(c.pacte.max)+'</span><div class="pips">'+Array.from({length:num(c.pacte.max)},(_,j)=>'<button class="pip vio '+(c.pacte.used>j?"on":"")+'" data-pacte="'+(j+1)+'"></button>').join("")+'</div></div>':'');
  const lv={};c.sorts.forEach((s,i)=>{(lv[num(s.niv)]=lv[num(s.niv)]||[]).push([s,i])});
  const sortsHtml=Object.keys(lv).sort((a,b)=>a-b).map(n=>'<div class="catt">'+(+n?"Niveau "+n:"Tours de magie")+'</div>'+lv[n].map(([s,i])=>
    '<div class="sp"><div class="row"><button class="lnk3" data-act="sexp" data-i="'+i+'">'+esc(s.nom||"Sort")+(s.conc?' <span class="tag">C</span>':'')+'</button><button class="btn sm pri" data-act="cast" data-i="'+i+'">Lancer</button></div>'+
    (state.sopen[i]&&s.note?'<div class="small desc2">'+esc(s.note)+'</div>':'')+'</div>').join("")).join("");
  return '<div class="card" style="border-left:5px solid '+c.couleur+'"><div class="row">'+avatar(c,40)+'<div class="grow" style="min-width:0"><b class="lnk2">'+esc(c.nom)+'</b><div class="small mute">'+esc(classLine(c))+'</div></div><button class="btn sm" data-open="'+c.id+'">Fiche</button></div>'+
    '<div class="bar" style="height:26px;margin-top:12px"><i data-d="pvbar"></i><i data-d="tmpbar" style="background:var(--blue);opacity:.7"></i><div class="t" data-d="pvtxt"></div></div>'+
    '<div class="row" style="margin-top:8px"><input type="number" inputmode="numeric" id="dmg" placeholder="Valeur" style="flex:1"><button class="btn" data-act="dmg" style="color:var(--bad)">Dégâts</button><button class="btn" data-act="heal" style="color:var(--acc)">Soin</button></div>'+
    '<div class="row small" style="margin-top:8px;gap:6px"><span class="mute">PV temp.</span><div class="counter"><button data-inc="pv.temp" data-v="-1" data-min="0">−</button><input type="number" data-k="pv.temp" data-t="n" value="'+num(c.pv.temp)+'"><button data-inc="pv.temp" data-v="1">+</button></div></div>'+
    (c.pv.act===0?'<div class="ds"><b>À terre : jets contre la mort</b><div class="row" style="justify-content:space-between;margin-top:6px"><span class="small">Succès</span><div class="pips">'+[1,2,3].map(i=>'<button class="pip '+(c.dsSucc>=i?"on":"")+'" data-pip="dsSucc" data-v="'+i+'"></button>').join("")+'</div><span class="small">Échecs</span><div class="pips">'+[1,2,3].map(i=>'<button class="pip bad '+(c.dsEch>=i?"on":"")+'" data-pip="dsEch" data-v="'+i+'"></button>').join("")+'</div></div></div>':'')+
    '<div class="stats4"><div><small>CA</small><b>'+c.ca+'</b></div><div><small>Init</small><b data-d="init"></b></div><div><small>Perc. pass.</small><b data-d="pp"></b></div><div><small>DD sorts</small><b data-d="dd"></b></div></div>'+
    '<div class="catt">Ce tour-ci</div><div class="eco">'+ECO.map(([k,l])=>'<button class="chip ecob '+(state.eco[k]?"used":"")+'" data-act="eco" data-e="'+k+'">'+(state.eco[k]?"✓ ":"")+l+'</button>').join("")+'<button class="chip" data-act="ecoreset" title="Nouveau tour">↺</button></div>'+
    deckHtml(c)+'<div class="catt">Attaques et dégâts</div>'+atkCalc(c)+
    (c.ressources.length?'<div class="catt">Charges et ressources</div>'+c.ressources.map((x,i)=>'<div class="row res2"><span class="grow small">'+esc(x.nom)+'</span><div class="counter"><button data-inc="ressources.'+i+'.act" data-v="-1" data-min="0">−</button><input type="number" data-k="ressources.'+i+'.act" data-t="n" value="'+num(x.act)+'"><button data-inc="ressources.'+i+'.act" data-v="1">+</button></div><span class="small mute">/ '+num(x.max)+'</span></div>').join(""):'')+
    '<div class="catt">Emplacements de sorts</div>'+(slotRows||'<div class="small mute">Aucun emplacement renseigné.</div>')+
    (canCalc&&(noSlots||state.showCalc)?'<button class="btn add" data-act="slotcalc">✨ Calculer mes emplacements (règles D&D) : '+esc(slotText(r))+'</button>':'')+
    '<div class="catt">États</div><div class="chips">'+ETATS.map(e=>'<button class="chip '+(c.etats.includes(e)?"on":"")+'" data-etat="'+e+'">'+e+'</button>').join("")+'</div>'+
    '<details class="don rules"><summary>📜 Règles de la table</summary><div class="small"><b>Intervention</b> : quand une attaque (projectile, mêlée ou sort) cible un joueur, un autre joueur juste à côté peut, par sa réaction, utiliser la moitié de son déplacement encore disponible pour s\'interposer et l\'intercepter. Le jet à réussir et les conséquences sont décidés par le MJ.<br><br><b>Lancer intense</b> : le MJ peut demander un jet intense. Il devient critique : réussite ou échec critique selon le résultat. Aucun modificateur ne s\'ajoute.<br><br><b>À 0 PV</b> : jet contre la mort DD 10, +1 par tour. 20 = 3 succès, 1 = 2 échecs, subir des dégâts = 1 échec. Tu peux ajouter des dés de vie au jet. Un allié peut donner un succès avec Médecine DD 10.</div></details>'+
    '<button class="btn" data-act="short" style="width:100%;margin-top:14px">☕ Repos court</button></div>';
}
function castSpell(c,i,after){
  const s=c.sorts[i];if(!s)return;const n=num(s.niv);
  const done=lbl=>{if(s.conc&&!c.etats.includes("Concentration"))c.etats.push("Concentration");schedule(c);rerenderPane();toast(s.nom+" lancé"+(lbl?" ("+lbl+")":""));if(after)setTimeout(after,250)};
  if(n===0)return done("");
  const opts=[];c.slots.forEach((sl,j)=>{if(j+1>=n&&num(sl.used)<num(sl.max))opts.push(["s"+j,"Emplacement niv "+(j+1)+" ("+(num(sl.max)-num(sl.used))+" restant)"])});
  if(num(c.pacte.max)&&num(c.pacte.niv)>=n&&num(c.pacte.used)<num(c.pacte.max))opts.unshift(["p","Emplacement de pacte niv "+num(c.pacte.niv)+" ("+(num(c.pacte.max)-num(c.pacte.used))+" restant)"]);
  const m=modal('<h2>'+esc(s.nom)+'</h2>'+(s.note?'<p class="small">'+esc(s.note)+'</p>':'')+(opts.length?'<div class="grid">'+opts.map(o=>'<button class="btn" data-o="'+o[0]+'">'+o[1]+'</button>').join("")+'</div>':'<p class="small" style="color:var(--bad)">Plus d\'emplacement disponible pour ce niveau.</p>')+
    '<div class="acts"><button class="btn" data-free>Sans emplacement</button><button class="btn" data-x>Annuler</button></div>');
  m.querySelector("[data-x]").onclick=()=>m.remove();
  m.querySelector("[data-free]").onclick=()=>{m.remove();done("gratuit")};
  m.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{const o=b.dataset.o;if(o==="p"){c.pacte.used=num(c.pacte.used)+1;m.remove();done("pacte")}else{const j=+o.slice(1);c.slots[j].used=num(c.slots[j].used)+1;m.remove();done("niv "+(j+1))}});
}
function combatAct(a,d){
  const cb=G.combat||GDEF().combat;
  if(a==="cbstart"){swordsAnim(true);const lignes={};persos().filter(p=>!p.retire).forEach(p=>{lignes["p"+p.id]={nom:p.nom,init:"",persoId:p.id}});G.combat={actif:true,round:1,tour:"",lignes};save("groupe","combat",true);rerenderPane();return true}
  if(a==="cbend")return confirmBox("Terminer le combat ? L'ordre d'initiative sera effacé.",()=>{G.combat={actif:false,round:1,tour:"",lignes:{}};save("groupe","combat",true);state.eco={};rerenderPane()},"Terminer"),true;
  if(a==="cbnext"){const L=lignesTriees(cb);if(!L.length)return true;const i=L.findIndex(l=>l.id===cb.tour);let tour,round=num(cb.round||1);
    if(i<0)tour=L[0].id;else if(i>=L.length-1){tour=L[0].id;round++}else tour=L[i+1].id;
    G.combat.tour=tour;G.combat.round=round;cbUpdate({tour,round});rerenderPane();return true}
  if(a==="cbaddpnj"){const m=modal('<h2>Ajouter un monstre / PNJ</h2><div class="grid"><div><label class="f">Nom</label><input id="pn" placeholder="Gobelin 1"></div><div class="grid g2"><div><label class="f">Initiative</label><input id="pi" type="number" inputmode="numeric"></div><div><label class="f">PV (facultatif)</label><input id="pp" type="number" inputmode="numeric"></div></div><div><label class="f">Nombre</label><input id="pq" type="number" value="1" min="1" max="20"></div></div><div class="acts"><button class="btn" data-x>Annuler</button><button class="btn pri" data-ok>Ajouter</button></div>');
    m.querySelector("[data-x]").onclick=()=>m.remove();
    m.querySelector("[data-ok]").onclick=()=>{const nom=m.querySelector("#pn").value.trim()||"Monstre",init=m.querySelector("#pi").value,pv=num(m.querySelector("#pp").value),qn=clamp(num(m.querySelector("#pq").value)||1,1,20);const f={};
      for(let k=0;k<qn;k++){const id="m"+uid();const l={nom:qn>1?nom+" "+(k+1):nom,init:init===""?"":num(init),persoId:"",pv,pvmax:pv};G.combat.lignes[id]=l;f["lignes."+id]=l}
      cbUpdate(f);m.remove();rerenderPane()};return true}
  if(a==="cbdel"){delete G.combat.lignes[d.line];cbUpdate({["lignes."+d.line]:fs.deleteField()});rerenderPane();return true}
  if(a==="cbroll"){const l=cb.lignes[d.line];const p=l&&S.persos.get(l.persoId);if(!p)return true;const r=1+Math.floor(Math.random()*20),v=r+mod(p.car.dex)+num(p.initBonus);l.init=v;cbUpdate({["lignes."+d.line+".init"]:v});rerenderPane();toast("🎲 "+r+" "+sg(mod(p.car.dex)+num(p.initBonus))+" = "+v);return true}
  if(a==="cbperso"){state.cbPerso=d.id;state.eco={};rerenderPane();return true}
  if(a==="eco"){state.eco[d.e]=!state.eco[d.e];rerenderPane();return true}
  if(a==="ecoreset"){state.eco={};state.turnLog=[];state.played={};rerenderPane();return true}
  if(a==="sexp"){state.sopen[d.i]=!state.sopen[d.i];rerenderPane();return true}
  return false;
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
function start(){if(started)return;started=true;remote={db:fdb};lsLoad();render();subscribe();setTimeout(loadSRD,1500)}
onAuthStateChanged(auth,async u=>{
  if(!u){started=false;myId=null;return loginScreen("")}
  myId=u.uid;
  try{const p=await getDoc(doc(fdb,"users",u.uid));if(p.exists()){me=p.data();start()}else joinScreen(u)}
  catch(e){if(e&&e.code==="permission-denied")joinScreen(u);else{app.innerHTML='<div class="login"><h1>⚔️ Fiches JDR</h1><p class="sub">Impossible de joindre la base. Vérifie ta connexion.</p><button class="btn pri" onclick="location.reload()" style="width:100%">Réessayer</button></div>'}}
});
// Bouton retour Android
try{const C=window.Capacitor;if(C&&C.Plugins&&C.Plugins.App)C.Plugins.App.addListener("backButton",()=>{if(document.querySelector(".modal")){document.querySelector(".modal").remove();return}if(state.view==="sheet"){state.view="home";render();return}if(state.home!=="persos"){state.home="persos";render();return}C.Plugins.App.exitApp()})}catch(e){}
})();

