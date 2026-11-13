const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const page=fs.readFileSync(path.join(__dirname,'index.html'));
const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(page)});
const wss=new WebSocketServer({server:srv}),parties={};let nid=1;
const send=(w,o)=>w.readyState===1&&w.send(JSON.stringify(o));
const all=(p,o,ex)=>p.m.forEach(w=>w!==ex&&send(w,o));
const list=p=>p.m.map(x=>({id:x.id,name:x.name}));
const lobby=p=>p.m.forEach(w=>send(w,{t:'lobby',code:p.code,host:p.m[0].id,you:w.id,map:p.map,players:list(p)}));
wss.on('connection',ws=>{
  ws.id=nid++;
  ws.on('message',d=>{
    let m;try{m=JSON.parse(d)}catch{return}
    const p=parties[ws.code];
    if(m.t==='create'||m.t==='join'){
      if(p)return;
      ws.name=String(m.name||'Piloto').slice(0,12);
      let q;
      if(m.t==='create'){
        let c;do c=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');while(parties[c]);
        q=parties[c]={code:c,map:Math.min(2,Math.max(0,+m.map|0)),m:[],go:false};
      }else{
        q=parties[String(m.code).toUpperCase()];
        if(!q)return send(ws,{t:'err',m:'Esa party no existe'});
        if(q.go)return send(ws,{t:'err',m:'La carrera ya empezó'});
        if(q.m.length>=10)return send(ws,{t:'err',m:'Party llena (10/10)'});
      }
      q.m.push(ws);ws.code=q.code;lobby(q);return;
    }
    if(!p)return;
    if(m.t==='start'&&p.m[0]===ws){p.go=true;all(p,{t:'start',map:p.map,players:list(p)})}
    else if(m.t==='reset'&&p.m[0]===ws){p.go=false;lobby(p)}
    else if(m.t==='s'&&Array.isArray(m.s))all(p,{t:'s',id:ws.id,s:m.s.slice(0,4)},ws);
    else if(m.t==='fin')all(p,{t:'fin',name:ws.name,time:+m.time||0});
  });
  ws.on('close',()=>{
    const p=parties[ws.code];if(!p)return;
    p.m=p.m.filter(w=>w!==ws);
    if(!p.m.length)delete parties[p.code];
    else if(p.go)all(p,{t:'left',id:ws.id});
    else lobby(p);
  });
});
const PORT=process.env.PORT||3000;
srv.listen(PORT,()=>console.log('Ice Drift en http://localhost:'+PORT));
