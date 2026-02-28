import{C as p}from"./main-D09nmFcB.js";const e=document.getElementById("support-form");e.addEventListener("submit",o=>{o.preventDefault();const t=e.querySelector("#support-name")?.value?.trim()||"",n=e.querySelector("#support-email")?.value?.trim()||"",r=e.querySelector("#support-phone")?.value?.trim()||"",m=e.querySelector("#support-message")?.value?.trim()||"",s=encodeURIComponent("Zájem o Elephants Coffee"),a=encodeURIComponent(`Jméno: ${t}
E-mail: ${n}
Telefon: ${r||"—"}

Zpráva:
${m||"—"}`);window.location.href=`mailto:${p}?subject=${s}&body=${a}`});
