document.getElementById("run").addEventListener("click", ()=>{

  const url =
  document.getElementById("csvLink").value.trim();

  if(!url){
    alert("Cole o link CSV.");
    return;
  }

  chrome.runtime.sendMessage({
    acao:"iniciar",
    url:url
  });

});