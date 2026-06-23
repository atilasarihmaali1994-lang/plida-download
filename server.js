const express=require('express');
const app=express();
app.use(express.json());
app.use(express.static('public'));
const utenti=[{matricola:'984572',file:'/files/loubaqui-fatima.pdf'}];
app.post('/api/verifica',(req,res)=>{
 const matricola=(req.body.matricola||'').trim();
 const captcha=(req.body.captcha||'').trim();
 if(captcha!=='7') return res.status(401).json({ok:false,message:'Calcolo non corretto'});
 const u=utenti.find(x=>x.matricola===matricola);
 if(!u) return res.status(401).json({ok:false,message:'Matricola non valida'});
 res.json({ok:true,downloadUrl:u.file});
});
app.listen(process.env.PORT||3000);
