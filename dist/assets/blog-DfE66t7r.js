import"./main-Cwr3q_9d.js";import{l as c,a as i,g as d}from"./posts-DL4DhQq7.js";function s(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}const l=document.getElementById("blog-list"),o=document.getElementById("blog-single"),m=document.getElementById("blog-single-content");function g(){const e=d().sort((t,a)=>new Date(a.date)-new Date(t.date));l.innerHTML=e.map(t=>{const a=t.image?`<img src="${s(t.image)}" alt="" class="w-full aspect-video object-cover rounded-xl" loading="lazy" />`:"";return`
        <article class="border-b border-primary-100 pb-8 last:border-0 last:pb-0">
          <a href="blog.html#${t.slug}" class="group block py-2">
            ${a?`<div class="mb-4 overflow-hidden rounded-xl">${a}</div>`:""}
            <p class="text-sm text-primary-500">${new Date(t.date).toLocaleDateString("cs-CZ")}</p>
            <h2 class="mt-2 text-xl font-bold text-primary-900 group-hover:text-primary-700 transition">${s(t.title)}</h2>
            <p class="mt-2 text-primary-600">${s(t.excerpt)}</p>
          </a>
        </article>
      `}).join("")}function r(e){const t=e.image?`<img src="${s(e.image)}" alt="" class="mt-8 w-full max-w-full h-auto rounded-2xl" loading="lazy" />`:"";m.innerHTML=`
        <p class="text-sm text-primary-500">${new Date(e.date).toLocaleDateString("cs-CZ")}</p>
        <h2 class="mt-2 text-3xl font-bold text-primary-900">${s(e.title)}</h2>
        <div class="mt-6 text-primary-600 whitespace-pre-wrap">${s(e.body)}</div>
        ${t}
      `,l.classList.add("hidden"),o.classList.remove("hidden")}function n(){o.classList.add("hidden"),l.classList.remove("hidden"),g()}(async()=>{await c();const e=window.location.hash.slice(1);if(e){const t=i(e);t?r(t):n()}else n()})();window.addEventListener("hashchange",()=>{const e=window.location.hash.slice(1);if(!e)n();else{const t=i(e);t?r(t):n()}});
