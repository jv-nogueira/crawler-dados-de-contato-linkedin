let resultados = [];
let links = [];
let indiceAtual = 0;

console.log("🚀 Background iniciado");

chrome.runtime.onMessage.addListener((msg)=>{

  if(msg.acao === "iniciar"){
    iniciar(msg.url);
  }

});

async function iniciar(url){

  console.log("🌐 Lendo planilha:", url);

  resultados = [];
  links = [];
  indiceAtual = 0;

  const texto =
  await fetch(url).then(r=>r.text());

  const linhas =
  texto
    .replace(/\r/g,"")
    .split("\n")
    .filter(Boolean)
    .map(l =>
      l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    );

  const header = linhas[0];

  const colunaLink =
  header.findIndex(x =>
    x.replace(/"/g,"").trim().toLowerCase() === "link"
  );

  const colunaEmpresa =
  header.findIndex(x =>
    x.replace(/"/g,"").trim().toLowerCase() === "empresa"
  );

  const colunaDadosContato =
  header.findIndex(x =>
    x.replace(/"/g,"").trim().toLowerCase() === "dados contato"
  );

  if(colunaLink === -1){
    console.log("❌ Coluna Link não encontrada");
    return;
  }

  if(colunaEmpresa === -1){
    console.log("⚠️ Coluna Empresa não encontrada");
  }

  if(colunaDadosContato === -1){
    console.log("⚠️ Coluna 'Dados contato' não encontrada");
  }

  for(let i=1;i<linhas.length;i++){

    const link =
    (linhas[i][colunaLink] || "")
    .replace(/"/g,"")
    .trim();

    const empresa =
    colunaEmpresa !== -1
      ? (linhas[i][colunaEmpresa] || "")
          .replace(/"/g,"")
          .trim()
      : "";

    const dadosContato =
    colunaDadosContato !== -1
      ? (linhas[i][colunaDadosContato] || "")
          .replace(/"/g,"")
          .trim()
          .toLowerCase()
      : "";

    // 🔴 REGRA: pular se TRUE
    if(dadosContato === "true"){
      continue;
    }

    if(link.includes("linkedin.com")){
      links.push({
        url: link,
        empresa: empresa
      });
    }
  }

  console.log("🔗 Links encontrados:", links.length);

  await processarProximo();
}

async function processarProximo(){

  if(indiceAtual >= links.length){

    console.log("🏁 FIM DA LISTA");
    console.log("📥 Resultados:", resultados);

    setTimeout(()=>{
      baixarResultado();
    },1500);

    return;
  }

  const item = links[indiceAtual];
  const url = item.url;

  console.log(`➡️ Abrindo (${indiceAtual+1}/${links.length}):`, url);

  const win =
  await chrome.windows.create({
    url:url,
    type:"popup",
    width:900,
    height:800
  });

  const tabId = win.tabs[0].id;

  await new Promise((resolve)=>{

    chrome.tabs.onUpdated.addListener(function listener(id,info){

      if(id === tabId && info.status === "complete"){

        chrome.tabs.onUpdated.removeListener(listener);

        setTimeout(async ()=>{

          try{

            const res =
            await chrome.scripting.executeScript({
              target:{tabId},
              func: coletarDados
            });

            console.log("📦 Extraído:", res[0].result);

            resultados.push({
              ...res[0].result,
              Empresa: item.empresa
            });

          }catch(e){

            console.log("❌ erro coleta:", e);

            resultados.push({
              Nome:"",
              PerfilContato:url,
              Email:"",
              Telefone:"",
              Nascimento:"",
              TodosDados:"ERRO",
              Empresa: item.empresa
            });

          }

          chrome.windows.remove(win.id);

          indiceAtual++;

          resolve();

        },8000);

      }

    });

  });

  await processarProximo();
}

function baixarResultado(){

  console.log("📥 Iniciando download final...");

  let linhas = [];

  linhas.push(
    "Nome\tPerfilContato\tEmail\tTelefone\tNascimento\tEmpresa\tTodosDados"
  );

  for(const r of resultados){

    linhas.push([
      csv(r.Nome),
      csv(r.PerfilContato),
      csv(r.Email),
      csv(r.Telefone),
      csv(r.Nascimento),
      csv(r.Empresa),
      csv(r.TodosDados)
    ].join("\t"));

  }

  const conteudo =
  linhas.join("\n");

  const blob =
  new Blob([conteudo], { type: "text/plain" });

  const reader =
  new FileReader();

  reader.onload = function(){

    const dataUrl = reader.result;

    console.log("🔗 DataURL gerada (preview):", dataUrl.substring(0,80));

    chrome.downloads.download({

      url: dataUrl,
      filename: "linkedin_resultado.txt",
      saveAs: false

    }, (id)=>{

      if(chrome.runtime.lastError){
        console.log("❌ ERRO DOWNLOAD:", chrome.runtime.lastError.message);
      } else {
        console.log("✅ DOWNLOAD OK ID:", id);
      }

    });

  };

  reader.readAsDataURL(blob);
}

function csv(txt){
  return `"${String(txt||"").replace(/"/g,'""')}"`;
}

function coletarDados(){

return (async function () {

function $$(sel){
  return Array.from(document.querySelectorAll(sel));
}

function esperar(ms){
  return new Promise(r => setTimeout(r, ms));
}

function limpar(v){
  return String(v||"").replace(/\n+/g,"\n").trim();
}

try{

let buttonInfo =
$$('a[href*="overlay/contact-info"]')[0];

let profileName = "";

if(
document.querySelectorAll('[data-testid="lazy-column"]')[0]
){
profileName =
document.querySelectorAll('[data-testid="lazy-column"]')[0]
.querySelectorAll('h2')[0]
.innerText;
}

buttonInfo?.click();

await esperar(5000);

let profileContact = "";
let emailContact = "";
let birthContact = "";
let phoneContact = "";

try{
profileContact =
$$('[id="linkedin-bug-medium"]')[0]
.parentElement.children[1]
.querySelectorAll('[href]')[0]
.href;
}catch(e){}

try{
emailContact =
$$('[id="envelope-medium"]')[0]
.parentElement
.querySelectorAll('a[href^="mailto:"]')[0]
.innerText;
}catch(e){}

try{
phoneContact = 
$$('[id="phone-handset-small"]')[0]
.parentElement
.querySelectorAll('p')[1]
.children[0]
.innerText;
}catch(e){}

try{
birthContact =
$$('[id="calendar-medium"]')[0]
.parentElement
.querySelectorAll('p')[1]
.innerText;
}catch(e){}

let allContact =
$$('[role="main"]')[0]?.innerText || "";

return {
  Nome: limpar(profileName),
  PerfilContato: limpar(profileContact),
  Email: limpar(emailContact),
  Telefone: limpar(phoneContact),
  Nascimento: limpar(birthContact),
  TodosDados: limpar(allContact)
};

}catch(e){

return {
  Nome:"",
  PerfilContato:"",
  Email:"",
  Telefone:"",
  Nascimento:"",
  TodosDados:"ERRO"
};

}

})();
}