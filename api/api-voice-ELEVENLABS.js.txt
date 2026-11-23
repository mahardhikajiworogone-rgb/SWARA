// POST {text, voice_id} -> {audioBase64 (mp3), voice_id}
// Model multilingual v2 - dukung Bahasa Indonesia (id)
module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.ELEVENLABS_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, mode:'elevenlabs-tts', hint:'POST {text, voice_id}'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({error:'ELEVENLABS_API_KEY belum diset di Vercel ENV.'});
  var text='', voice_id='';
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); text=(b.text||'').trim(); voice_id=b.voice_id||''; }catch(e){}
  if(!text) return res.status(200).json({error:'Isi teks dulu.'});
  if(!voice_id) return res.status(200).json({error:'Voice ID clone belum ada. Bikin clone dulu di menu Clone Suara Saya.'});
  if(text.length > 2500) text = text.slice(0,2500);
  try{
    var controller=new AbortController(); var timer=setTimeout(function(){ try{controller.abort();}catch(e){} }, 28000);
    var rr;
    try{
      rr = await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(voice_id), {method:'POST',
        headers:{'xi-api-key':key,'Content-Type':'application/json','Accept':'audio/mpeg'},
        body:JSON.stringify({text:text, model_id:'eleven_multilingual_v2', voice_settings:{stability:0.5, similarity_boost:0.75, style:0.0, use_speaker_boost:true}}),
        signal:controller.signal});
    } finally{ clearTimeout(timer); }
    if(!rr.ok){
      var tj = await rr.text().catch(function(){ return ''; });
      return res.status(200).json({error:'ElevenLabs TTS gagal (HTTP '+rr.status+'): '+tj.slice(0,300)});
    }
    var ab = await rr.arrayBuffer();
    var b64 = Buffer.from(ab).toString('base64');
    return res.status(200).json({audioBase64:b64, mimeType:'audio/mpeg', voice_id:voice_id});
  }catch(e){ return res.status(200).json({error:'Gagal hubungi ElevenLabs: '+e.message}); }
};
