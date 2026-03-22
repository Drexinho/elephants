import"./main-yb1R9oEw.js";import{l as v,g as b,a as $}from"./posts-DL4DhQq7.js";function o(t){const a=document.createElement("div");return a.textContent=t,a.innerHTML}function L(t){if(!t)return"";const a=/(https?:\/\/[^\s<]+)/g;let n="",e=0,r;for(;(r=a.exec(t))!==null;){n+=o(t.slice(e,r.index));let i=r[1],s="";for(;i.length>0&&/[.,;:!?)\]}»"'”]$/.test(i.slice(-1));)s=i.slice(-1)+s,i=i.slice(0,-1);const l=o(i),m=o(i);n+=`<a href="${l}" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline break-words">${m}</a>`,n+=o(s),e=r.index+r[1].length}return n+=o(t.slice(e)),n}const g=10,p=document.getElementById("blog-list"),c=document.getElementById("blog-pagination"),f=document.getElementById("blog-single"),P=document.getElementById("blog-single-content");function E(){const t=parseInt(new URLSearchParams(window.location.search).get("page")||"1",10);return Number.isNaN(t)||t<1?1:t}function D(t){const a=b().sort((i,s)=>new Date(s.date)-new Date(i.date)),n=Math.max(1,Math.ceil(a.length/g)),e=Math.min(Math.max(1,t),n),r=new URL(window.location.href);r.hash="",e<=1?r.searchParams.delete("page"):r.searchParams.set("page",String(e)),history.pushState({},"",r),w(),window.scrollTo({top:0,behavior:"smooth"})}function w(){const t=b().sort((s,l)=>new Date(l.date)-new Date(s.date)),a=t.length,n=Math.max(1,Math.ceil(a/g));let e=E();e>n&&(e=n);const r=(e-1)*g,i=t.slice(r,r+g);if(p.innerHTML=i.map(s=>{const l=s.image?`<img src="${o(s.image)}" alt="" class="w-full aspect-video object-cover rounded-xl" loading="lazy" />`:"";return`
        <article class="border-b border-primary-100 pb-8 last:border-0 last:pb-0">
          <a href="/blog${e>1?`?page=${e}`:""}#${s.slug}" class="group block py-2">
            ${l?`<div class="mb-4 overflow-hidden rounded-xl">${l}</div>`:""}
            <p class="text-sm text-primary-500">${new Date(s.date).toLocaleDateString("cs-CZ")}</p>
            <h2 class="mt-2 text-xl font-bold text-primary-900 group-hover:text-primary-700 transition">${o(s.title)}</h2>
            <p class="mt-2 text-primary-600">${o(s.excerpt)}</p>
          </a>
        </article>
      `}).join(""),n<=1)c.innerHTML="",c.classList.add("hidden");else{c.classList.remove("hidden");const s=e<=1,l=e>=n,m=`<button type="button" data-blog-page="${e-1}" ${s?"disabled":""} class="px-5 py-2.5 rounded-lg font-medium transition shrink-0 ${s?"text-primary-300 cursor-not-allowed":"text-primary-700 hover:bg-primary-100"}">← Předchozí</button>`,y=`<button type="button" data-blog-page="${e+1}" ${l?"disabled":""} class="px-5 py-2.5 rounded-lg font-medium transition shrink-0 ${l?"text-primary-300 cursor-not-allowed":"text-primary-700 hover:bg-primary-100"}">Další →</button>`;let h="";for(let d=1;d<=n;d++){const x=d===e;h+=`<button type="button" data-blog-page="${d}" class="min-w-[2.5rem] px-3 py-2 rounded-lg font-medium transition ${x?"bg-primary-900 text-white":"text-primary-700 hover:bg-primary-100"}" ${x?'disabled aria-current="page"':""}>${d}</button>`}c.innerHTML=`
          <div class="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 w-full max-w-2xl mx-auto">
            <div class="flex justify-center">${m}</div>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <span class="text-primary-500 whitespace-nowrap px-2">Stránka ${e} z ${n}</span>
              <div class="flex items-center justify-center gap-2 sm:gap-3">${h}</div>
            </div>
            <div class="flex justify-center">${y}</div>
          </div>`}}c.addEventListener("click",t=>{const a=t.target.closest("[data-blog-page]");if(!a||a.disabled)return;const n=parseInt(a.getAttribute("data-blog-page"),10);Number.isNaN(n)||D(n)});function M(t){const a=t.image?`<img src="${o(t.image)}" alt="" class="mt-8 w-full max-w-full h-auto rounded-2xl" loading="lazy" />`:"";P.innerHTML=`
        <p class="text-sm text-primary-500">${new Date(t.date).toLocaleDateString("cs-CZ")}</p>
        <h2 class="mt-2 text-3xl font-bold text-primary-900">${o(t.title)}</h2>
        <div class="mt-6 text-primary-600 whitespace-pre-wrap">${L(t.body)}</div>
        ${a}
      `,p.classList.add("hidden"),c.classList.add("hidden"),f.classList.remove("hidden")}function S(){f.classList.add("hidden"),p.classList.remove("hidden"),c.classList.remove("hidden"),w()}function u(){const t=window.location.hash.slice(1);if(t){const a=$(t);if(a){M(a);return}}S()}(async()=>(await v(),u()))();window.addEventListener("hashchange",()=>{u()});window.addEventListener("popstate",()=>{u()});
