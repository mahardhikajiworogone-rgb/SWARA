module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, streaming:true, hint:'POST {message, stream:true} untuk streaming'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({reply:'[Mode Lokal] GEMINI_API_KEY belum diset di Vercel ENV.'});
  var message=''; var wantStream=false;
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); message=b.message||''; wantStream=!!b.stream; }catch(e){}
  if(!message) return res.status(200).json({reply:'Kirim pesan dulu ya.'});
  var prompt='Kamu adalah SWARA, asisten AI voice Indonesia. Jawab singkat, ramah. User: '+message;
  var models=['gemini-3.8-flash','gemini-2.5-flash','gemini-1.5-flash'];
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  // --- STREAMING ---
  if(wantStream){
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    for(var mi=0; mi<models.length; mi++){
      try{
        var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+models[mi]+':streamGenerateContent?alt=sse&key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
        if(!r.ok){
          var errT=''; try{ errT=await r.text(); }catch(e){}
          if(r.status===503||r.status===429){ await sleep(800); continue; }
          res.write('data: '+JSON.stringify({text:'Gemini error ('+r.status+'): '+errT.slice(0,200)})+'\n\n'); res.write('data: [DONE]\n\n'); return res.end();
        }
        var reader=r.body.getReader(); var dec=new TextDecoder(); var buf='';
        while(true){
          var ch=await reader.read(); if(ch.done) break;
          buf+=dec.decode(ch.value,{stream:true});
          var lines=buf.split('\n'); buf=lines.pop();
          for(var li=0; li<lines.length; li++){
            var line=lines[li].trim(); if(line.indexOf('data:')!==0) continue;
            var pay=line.slice(5).trim(); if(!pay) continue;
            try{
              var j=JSON.parse(pay);
              var parts=j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts;
              if(parts){ for(var pi=0; pi<parts.length; pi++){ if(parts[pi].text) res.write('data: '+JSON.stringify({text:parts[pi].text})+'\n\n'); } }
            }catch(e){}
          }
        }
        res.write('data: [DONE]\n\n'); return res.end();
      }catch(e){
        if(mi===models.length-1){ res.write('data: '+JSON.stringify({text:'Gagal hubungi Gemini: '+e.message})+'\n\n'); res.write('data: [DONE]\n\n'); return res.end(); }
      }
    }
    return res.end();
  }
  // --- NON-STREAMING (fallback lama) ---
  var lastErr='';
  for(var i=0;i<models.length;i++){
    for(var att=0; att<2; att++){
      try{
        var rr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
        var jj = await rr.json().catch(function(){ return {}; });
        if(rr.ok){
          var reply=(jj&&jj.candidates&&jj.candidates[0]&&jj.candidates[0].content&&jj.candidates[0].content.parts&&jj.candidates[0].content.parts[0]&&jj.candidates[0].content.parts[0].text)||'';
          if(reply) return res.status(200).json({reply:reply, model:models[i]});
          lastErr='Tidak ada balasan dari '+models[i]; break;
        }
        lastErr='Gemini error ('+rr.status+') pada '+models[i]+': '+((jj&&jj.error&&jj.error.message)||'');
        if(rr.status===503||rr.status===429||rr.status===404){ if(att===0){ await sleep(1200); continue; } break; }
        return res.status(200).json({reply:lastErr});
      }catch(e){ lastErr='Gagal hubungi Gemini via '+models[i]+': '+e.message; if(att===0){ await sleep(1200); continue; } break; }
    }
  }
  return res.status(200).json({reply:'Maaf, server Gemini sedang sibuk. Coba lagi dalam 1-2 menit. Detail: '+lastErr});
};
