module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, streaming:true, mode:'generateContent-chunked', hint:'POST {message, stream:true}'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({reply:'[Mode Lokal] GEMINI_API_KEY belum diset di Vercel ENV.'});
  var message=''; var wantStream=false;
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); message=b.message||''; wantStream=!!b.stream; }catch(e){}
  if(!message) return res.status(200).json({reply:'Kirim pesan dulu ya.'});
  var prompt='Kamu adalah SWARA, asisten AI voice Indonesia. Jawab singkat, ramah. User: '+message;
  var models=['gemini-3.8-flash','gemini-2.0-flash','gemini-1.5-flash'];
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  // Ambil balasan penuh via generateContent (jalur yang sudah terbukti jalan)
  var reply=''; var lastErr='';
  for(var i=0;i<models.length;i++){
    for(var att=0; att<2; att++){
      try{
        var rr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
        var jj = await rr.json().catch(function(){ return {}; });
        if(rr.ok){
          reply=(jj&&jj.candidates&&jj.candidates[0]&&jj.candidates[0].content&&jj.candidates[0].content.parts&&jj.candidates[0].content.parts[0]&&jj.candidates[0].content.parts[0].text)||'';
          if(reply) break;
          lastErr='Tidak ada balasan dari '+models[i]; break;
        }
        lastErr='Gemini error ('+rr.status+') pada '+models[i]+': '+((jj&&jj.error&&jj.error.message)||'');
        if(rr.status===503||rr.status===429||rr.status===404){ if(att===0){ await sleep(1200); continue; } break; }
        break;
      }catch(e){ lastErr='Gagal hubungi Gemini via '+models[i]+': '+e.message; if(att===0){ await sleep(1200); continue; } break; }
    }
    if(reply) break;
  }
  if(!reply){
    if(wantStream){
      res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
      res.write('data: '+JSON.stringify({text:'Maaf, server Gemini sedang sibuk. Coba lagi dalam 1-2 menit. Detail: '+lastErr})+'\n\n');
      res.write('data: [DONE]\n\n'); return res.end();
    }
    return res.status(200).json({reply:'Maaf, server Gemini sedang sibuk. Coba lagi dalam 1-2 menit. Detail: '+lastErr});
  }
  // STREAMING: kirim balasan potong-potong kata per kata
  if(wantStream){
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    // Potong per kata biar di HP kelihatan mengalir
    var parts=reply.match(/\S+\s*/g) || [reply];
    for(var pi=0; pi<parts.length; pi++){
      res.write('data: '+JSON.stringify({text:parts[pi]})+'\n\n');
      if(pi%3===0) await sleep(12);
    }
    res.write('data: [DONE]\n\n'); return res.end();
  }
  return res.status(200).json({reply:reply});
};
