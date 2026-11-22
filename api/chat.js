module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, mode:'json-typewriter', hint:'POST {message}'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({reply:'[Mode Lokal] GEMINI_API_KEY belum diset di Vercel ENV.'});
  var message='';
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); message=b.message||''; }catch(e){}
  if(!message) return res.status(200).json({reply:'Kirim pesan dulu ya.'});
  var prompt='Kamu adalah SWARA, asisten AI voice Indonesia. Jawab singkat, ramah. User: '+message;
  var models=['gemini-3.8-flash','gemini-2.5-flash-lite','gemini-2.0-flash','gemini-1.5-flash-001'];
  var versions=['v1beta','v1'];
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  var reply=''; var lastErr='';
  outer:
  for(var i=0;i<models.length;i++){
    for(var v=0;v<versions.length;v++){
      for(var att=0; att<2; att++){
        try{
          var url='https://generativelanguage.googleapis.com/'+versions[v]+'/models/'+models[i]+':generateContent?key='+key;
          var rr = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
          var jj = await rr.json().catch(function(){ return {}; });
          if(rr.ok){
            reply=(jj&&jj.candidates&&jj.candidates[0]&&jj.candidates[0].content&&jj.candidates[0].content.parts&&jj.candidates[0].content.parts[0]&&jj.candidates[0].content.parts[0].text)||'';
            if(reply) break outer;
            lastErr=models[i]+' / '+versions[v]+' -> 200 tapi tanpa teks (mungkin safety filter).'; break;
          }
          lastErr=models[i]+' / '+versions[v]+' -> HTTP '+rr.status+' : '+((jj&&jj.error&&jj.error.message)||'');
          if(rr.status===503||rr.status===429){ if(att===0){ await sleep(1200); continue; } break; }
          if(rr.status===404){ break; }
          break;
        }catch(e){ lastErr=models[i]+' / '+versions[v]+' -> fetch error: '+e.message; if(att===0){ await sleep(1200); continue; } break; }
      }
    }
  }
  if(!reply){
    // Jujur + detail singkat, tanpa tampilkan key. Frontend tetap tampilkan ini apa adanya.
    return res.status(200).json({reply:'Maaf, Gemini belum bisa menjawab. Detail: '+lastErr+' Coba lagi 1-2 menit ya.'});
  }
  return res.status(200).json({reply:reply});
};
