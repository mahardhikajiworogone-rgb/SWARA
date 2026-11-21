module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  var key = process.env.GEMINI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok', hasKey:!!key, hint:'POST {message} untuk chat'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed, use POST'});
  if(!key) return res.status(200).json({reply:'[Mode Lokal] GEMINI_API_KEY belum diset di Vercel ENV. Buka Vercel > Settings > Environment Variables.'});
  var message='';
  try{
    var b = typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{});
    message = b.message||'';
  }catch(e){ message=''; }
  if(!message) return res.status(200).json({reply:'Kirim pesan dulu ya.'});
  try{
    var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Kamu adalah SWARA, asisten AI voice Indonesia. Jawab singkat, ramah. User: '+message}]}]})});
    var j = await r.json().catch(function(){ return {}; });
    if(!r.ok) return res.status(200).json({reply:'Gemini error ('+r.status+'): '+((j&&j.error&&j.error.message)||'cek key / kuota / model')});
    var reply = (j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts&&j.candidates[0].content.parts[0]&&j.candidates[0].content.parts[0].text) || 'Tidak ada balasan dari Gemini';
    return res.status(200).json({reply:reply});
  }catch(e){ return res.status(200).json({reply:'Gagal hubungi Gemini: '+e.message}); }
};
