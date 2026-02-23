import{l as a,g as s}from"./posts-7GkFicWg.js";const r=document.getElementById("blog-preview-list");if(r){await a();const e=s().slice(0,3);r.innerHTML=e.map(t=>`
        <a href="blog.html#${t.slug}" class="card-hover block rounded-xl sm:rounded-2xl bg-primary-50 border border-primary-100 p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-200">
          <p class="text-sm text-primary-500">${new Date(t.date).toLocaleDateString("cs-CZ")}</p>
          <h3 class="mt-2 text-lg font-bold text-primary-900">${o(t.title)}</h3>
          <p class="mt-2 text-primary-600 text-sm line-clamp-2">${o(t.excerpt)}</p>
        </a>
      `).join("")}function o(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}
