// POST {name, audioBase64, fileName} -> {voice_id, name}
// Audio: hasil rekaman dari SWARA (webm/mp3/wav base64), 1-3 menit, Bahasa Indonesia
module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.ELEVENLABS_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, mode:'elevenlabs-clone', hint:'POST {name, audioBase64}'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({error:'ELEVENLABS_API_KEY belum diset di Vercel ENV.'});
  var name='Suara Saya', audioB64='', fileName='sample.webm';
  try{ var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{}); name=(b.name||'Suara Saya').toString().slice(0,80); audioB64=b.audioBase64||''; fileName=b.fileName||'sample.webm'; }catch(e){}
  if(!audioB64) return res.status(200).json({error:'Rekaman audio belum ada. Rekam 1-3 menit dulu.'});
  try{
    var buf = Buffer.from(audioB64, 'base64');
    if(buf.length < 10000) return res.status(200).json({error:'Rekaman terlalu pendek / rusak. Rekam minimal 1 menit suara bersih.'});
    var form = new FormData();
    form.append('name', name);
    form.append('description', 'Voice clone dari SWARA - Bahasa Indonesia');
    form.append('labels', JSON.stringify({language:'id', source:'swara'}));
    var blob = new Blob([buf], {type:'audio/webm'});
    form.append('files', blob, fileName);
    var rr = await fetch('https://api.elevenlabs.io/v1/voices/add', {method:'POST', headers:{'xi-api-key':key}, body:form});
    var jj = await rr.json().catch(function(){ return {}; });
    if(!rr.ok){
      var msg = (jj && jj.detail && jj.detail.message) || (jj && jj.detail) || ('HTTP '+rr.status);
      return res.status(200).json({error:'ElevenLabs gagal bikin clone: '+msg});
    }
    return res.status(200).json({voice_id: jj.voice_id || '', name:name, message:'Clone berhasil dibuat.'});
  }catch(e){ return res.status(200).json({error:'Gagal hubungi ElevenLabs: '+e.message}); }
};
