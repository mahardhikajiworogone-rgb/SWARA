module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, mode:'gemini-tts', hint:'POST {text, voiceName, style}'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({error:'GEMINI_API_KEY belum diset di Vercel ENV.'});
  var text='', voiceName='Kore', style='';
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); text=b.text||''; voiceName=b.voiceName||'Kore'; style=b.style||''; }catch(e){}
  text = (text||'').trim();
  if(!text) return res.status(200).json({error:'Isi teks dulu.'});
  if(text.length > 1000) text = text.slice(0,1000);
  // Instruksi gaya bicara (opsional) - Gemini TTS mendukung prompt gaya
  var prompt = style ? ('Ucapkan dengan gaya: ' + style + '. Teks: ' + text) : text;
  var tries = [
    {model:'gemini-2.5-flash-preview-tts', ver:'v1beta'},
    {model:'gemini-2.5-pro-preview-tts', ver:'v1beta'}
  ];
  var lastErr='';
  for(var i=0;i<tries.length;i++){
    try{
      var url='https://generativelanguage.googleapis.com/'+tries[i].ver+'/models/'+tries[i].model+':generateContent?key='+key;
      var controller=new AbortController(); var timer=setTimeout(function(){ try{controller.abort();}catch(e){} }, 25000);
      var rr;
      try{
        rr = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
            generationConfig:{responseModalities:['AUDIO'], speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voiceName}}}}}),
          signal:controller.signal});
      } finally{ clearTimeout(timer); }
      var jj = await rr.json().catch(function(){ return {}; });
      if(!rr.ok){ lastErr=tries[i].model+' -> HTTP '+rr.status+' : '+((jj&&jj.error&&jj.error.message)||''); continue; }
      var parts = (jj&&jj.candidates&&jj.candidates[0]&&jj.candidates[0].content&&jj.candidates[0].content.parts)||[];
      var audioB64='', mime='audio/L16;rate=24000';
      for(var p=0;p<parts.length;p++){ if(parts[p].inlineData && parts[p].inlineData.data){ audioB64=parts[p].inlineData.data; mime=parts[p].inlineData.mimeType||mime; break; } }
      if(!audioB64){ lastErr=tries[i].model+' -> 200 tapi tanpa audio.'; continue; }
      return res.status(200).json({audioBase64:audioB64, mimeType:mime, model:tries[i].model, voiceName:voiceName});
    }catch(e){ lastErr=tries[i].model+' -> '+e.message; }
  }
  return res.status(200).json({error:'Gemini TTS gagal. Detail: '+lastErr});
};
