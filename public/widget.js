(function(){
  var current = document.currentScript || document.querySelector('script[data-loja]');
  var lojaId = current && current.getAttribute('data-loja');
  var base = (current && current.src ? current.src.split('/widget.js')[0] : 'https://chamy.vercel.app');
  if(!lojaId || document.getElementById('chamy-widget-box')) return;
  var box = document.createElement('div');
  box.id = 'chamy-widget-box';
  box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:999999;max-width:340px;background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 18px 55px rgba(15,23,42,.22);padding:18px;font-family:Inter,Arial,sans-serif;';
  box.innerHTML = '<button aria-label="Fechar" style="position:absolute;right:10px;top:8px;border:0;background:transparent;font-size:20px;cursor:pointer;color:#64748b">×</button><div style="display:flex;gap:12px;align-items:center"><div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#5b21e8,#d31bc5,#ff8800);display:grid;place-items:center;color:#fff;font-size:23px">🔔</div><div><b style="font-size:16px">Receba promoções</b><p style="margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.35">Cadastre-se para receber novidades e ofertas desta loja.</p></div></div><a href="'+base+'/loja?loja_id='+encodeURIComponent(lojaId)+'" target="_blank" rel="noopener" style="margin-top:14px;display:flex;align-items:center;justify-content:center;text-decoration:none;border-radius:13px;padding:12px 14px;background:linear-gradient(135deg,#5b21e8,#d31bc5,#ff8800);color:#fff;font-weight:900">Quero receber avisos</a>';
  box.querySelector('button').onclick=function(){box.remove()};
  document.body.appendChild(box);
})();
