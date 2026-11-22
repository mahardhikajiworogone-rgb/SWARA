module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, models:['gemini-3.8-flash','gemini-2.5-flash','gemini-1.5-flash']});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({reply:'[Mode Lokal] GEMINI_API_KEY belum diset di Vercel ENV.'});
  var message='';
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); message = b.message||''; }catch(e){ message=''; }
  if(!message) return res.status(200).json({reply:'Kirim pesan dulu ya.'});
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  var models = ['gemini-3.8-flash','gemini-2.5-flash','gemini-1.5-flash'];
  var lastErr = '';
  for(var i=0;i<models.length;i++){
    for(var attempt=0; attempt<2; attempt++){
      try{
        var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Kamu adalah SWARA, asisten AI voice Indonesia. Jawab singkat, ramah. User: '+message}]}]})});
        var j = await r.json().catch(function(){ return {}; });
        if(r.ok){
          var reply = (j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts&&j.candidates[0].content.parts[0]&&j.candidates[0].content.parts[0].text) || '';
          if(reply) return res.status(200).json({reply:reply, model:models[i]});
          lastErr = 'Tidak ada balasan dari '+models[i];
          break;
        }
        lastErr = 'Gemini error ('+r.status+') pada '+models[i]+': '+((j&&j.error&&j.error.message)||'');
        if(r.status===503 || r.status===429 || r.status===404){
          if(attempt===0){ await sleep(1200); continue; }
          break;
        }
        return res.status(200).json({reply:lastErr});
      }catch(e){ lastErr = 'Gagal hubungi Gemini via '+models[i]+': '+e.message; if(attempt===0){ await sleep(1200); continue; } break; }
    }
  }
  return res.status(200).json({reply:'Maaf, server Gemini sedang sibuk (503 - high demand). Coba kirim lagi dalam 1-2 menit ya. Detail: '+lastErr});
};
