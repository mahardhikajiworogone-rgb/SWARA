module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, mode:'json-3.5', hint:'POST {message}'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({reply:'[Mode Lokal] GEMINI_API_KEY belum diset di Vercel ENV.'});
  var message='';
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); message=b.message||''; }catch(e){}
  if(!message) return res.status(200).json({reply:'Kirim pesan dulu ya.'});
  var prompt='Kamu adalah SWARA, asisten AI voice Indonesia. Jawab singkat, ramah. User: '+message;
  // Model sesuai rekomendasi Google (Nov 2026): 3.5-flash-lite pengganti 2.5-flash-lite
  var tries=[
    {model:'gemini-3.5-flash-lite', ver:'v1beta'},
    {model:'gemini-3.5-flash-lite', ver:'v1'},
    {model:'gemini-3.5-flash', ver:'v1beta'}
  ];
  var lastErr='';
  for(var i=0;i<tries.length;i++){
    try{
      var url='https://generativelanguage.googleapis.com/'+tries[i].ver+'/models/'+tries[i].model+':generateContent?key='+key;
      var controller=new AbortController(); var timer=setTimeout(function(){ try{controller.abort();}catch(e){} }, 8000);
      var rr;
      try{ rr = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}), signal:controller.signal}); }
      finally{ clearTimeout(timer); }
      var jj = await rr.json().catch(function(){ return {}; });
      if(rr.ok){
        var reply=(jj&&jj.candidates&&jj.candidates[0]&&jj.candidates[0].content&&jj.candidates[0].content.parts&&jj.candidates[0].content.parts[0]&&jj.candidates[0].content.parts[0].text)||'';
        if(reply) return res.status(200).json({reply:reply});
        lastErr=tries[i].model+' / '+tries[i].ver+' -> 200 tapi tanpa teks.';
        continue;
      }
      lastErr=tries[i].model+' / '+tries[i].ver+' -> HTTP '+rr.status+' : '+((jj&&jj.error&&jj.error.message)||'');
    }catch(e){
      lastErr=tries[i].model+' / '+tries[i].ver+' -> fetch error/timeout: '+e.message;
    }
  }
  return res.status(200).json({reply:'Maaf, Gemini belum bisa menjawab. Detail: '+lastErr+' Coba lagi ya.'});
};
