module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  return res.status(200).json({status:'belum_aktif',message:'Voice via Gemini TTS belum aktif. Tahap 1 memakai Browser TTS. Endpoint ini siap untuk validasi kuota + Gemini TTS Tahap 2.'});
};
