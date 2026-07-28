const STORAGE_KEY="projectflow_data_v1";
const state={data:{projects:[],ideas:[],updatedAt:null},view:"dashboard"};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today=()=>new Date().toISOString().slice(0,10);
const now=()=>new Date().toISOString();
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const formatDate=value=>value?new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${value}T00:00:00`)):"Sin fecha";

function load(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(parsed&&Array.isArray(parsed.projects)&&Array.isArray(parsed.ideas)) state.data=parsed;
  }catch{}
  renderAll();
}

function save(message){
  state.data.updatedAt=now();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data));
  renderAll();
  if(message) toast(message);
}

function toast(message){
  const el=document.createElement("div");
  el.className="toast";
  el.textContent=message;
  $("#toastContainer").appendChild(el);
  setTimeout(()=>el.remove(),2600);
}

function setView(view){
  state.view=view;
  $$(".view").forEach(v=>v.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const meta={
    dashboard:["Visión general","Dashboard","Nuevo proyecto"],
    projects:["Portafolio","Proyectos","Nuevo proyecto"],
    ideas:["Laboratorio creativo","Ideas","Nueva idea"],
    backups:["Seguridad de datos","Respaldos","Exportar"]
  }[view];
  $("#viewEyebrow").textContent=meta[0];
  $("#viewTitle").textContent=meta[1];
  $("#primaryAction span").textContent=meta[2];
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("open");
}

function statusClass(status){
  return {"Idea":"idea","En Desarrollo":"development","Pausado":"paused","Finalizado":"finished"}[status]||"idea";
}
function feasibilityClass(value){
  return {"Alta":"high","Media":"medium","Baja":"low"}[value]||"medium";
}

function renderAll(){
  renderMetrics();
  renderDashboard();
  renderProjects();
  renderIdeas();
  $("#navProjectsCount").textContent=state.data.projects.length;
  $("#navIdeasCount").textContent=state.data.ideas.length;
  lucide.createIcons();
}

function renderMetrics(){
  const p=state.data.projects;
  const done=p.filter(x=>x.status==="Finalizado").length;
  $("#metricTotal").textContent=p.length;
  $("#metricActive").textContent=p.filter(x=>x.status==="En Desarrollo").length;
  $("#metricDone").textContent=done;
  $("#metricDoneRate").textContent=`${p.length?Math.round(done/p.length*100):0}% completado`;
  $("#metricIdeas").textContent=state.data.ideas.length;
  $("#metricHighIdeas").textContent=`${state.data.ideas.filter(x=>x.feasibility==="Alta").length} con factibilidad alta`;
}

function renderDashboard(){
  const recentProjects=[...state.data.projects].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,4);
  $("#recentProjects").innerHTML=recentProjects.length?recentProjects.map(p=>`
    <div class="stack-item">
      <div class="stack-icon"><i data-lucide="folder"></i></div>
      <div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.status)}</small></div>
      <small>${formatDate(p.startDate)}</small>
    </div>`).join(""):emptyCompact("Aún no tienes proyectos.");

  const recentIdeas=[...state.data.ideas].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,4);
  $("#recentIdeas").innerHTML=recentIdeas.length?recentIdeas.map(i=>`
    <div class="stack-item">
      <div class="stack-icon"><i data-lucide="lightbulb"></i></div>
      <div><strong>${escapeHtml(i.title)}</strong><small>${escapeHtml(i.category)}</small></div>
      <small>${escapeHtml(i.feasibility)}</small>
    </div>`).join(""):emptyCompact("Aún no tienes ideas.");

  const statuses=["Idea","En Desarrollo","Pausado","Finalizado"];
  const total=Math.max(1,state.data.projects.length);
  const colors={"Idea":"var(--purple)","En Desarrollo":"var(--blue)","Pausado":"var(--amber)","Finalizado":"var(--green)"};
  $("#statusSummary").innerHTML=statuses.map(s=>{
    const count=state.data.projects.filter(p=>p.status===s).length;
    return `<div class="status-row"><span>${s}</span><div class="status-bar"><div class="status-fill" style="width:${count/total*100}%;background:${colors[s]}"></div></div><b>${count}</b></div>`;
  }).join("");

  const techCount={};
  state.data.projects.forEach(p=>(p.technologies||[]).forEach(t=>techCount[t]=(techCount[t]||0)+1));
  const techs=Object.entries(techCount).sort((a,b)=>b[1]-a[1]).slice(0,12);
  $("#techCloud").innerHTML=techs.length?techs.map(([name,count])=>`<span class="tech-chip">${escapeHtml(name)} · ${count}</span>`).join(""):emptyCompact("Agrega tecnologías a tus proyectos.");
}

function emptyCompact(text){return `<div class="empty"><div><h3>Sin datos todavía</h3><p>${text}</p></div></div>`}

function getFilteredProjects(){
  const q=$("#projectSearch").value.trim().toLowerCase();
  const status=$("#projectStatusFilter").value;
  const sort=$("#projectSort").value;
  const list=state.data.projects.filter(p=>{
    const matchStatus=status==="Todos"||p.status===status;
    const hay=[p.name,p.description,(p.technologies||[]).join(" ")].join(" ").toLowerCase();
    return matchStatus&&hay.includes(q);
  });
  list.sort((a,b)=>{
    if(sort==="name-asc") return a.name.localeCompare(b.name,"es");
    if(sort==="date-asc") return a.startDate.localeCompare(b.startDate);
    if(sort==="date-desc") return b.startDate.localeCompare(a.startDate);
    return new Date(b.updatedAt)-new Date(a.updatedAt);
  });
  return list;
}

function renderProjects(){
  const list=getFilteredProjects();
  $("#projectResultText").textContent=`${list.length} proyecto${list.length===1?"":"s"}`;
  $("#projectsGrid").innerHTML=list.length?list.map(p=>`
    <article class="project-card">
      <div class="card-top">
        <div>
          <span class="badge ${statusClass(p.status)}">${escapeHtml(p.status)}</span>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description)}</p>
        </div>
        <div class="card-actions">
          <button class="mini-btn" data-edit-project="${p.id}" title="Editar"><i data-lucide="pencil"></i></button>
          <button class="mini-btn" data-delete-project="${p.id}" title="Eliminar"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="tags">${(p.technologies||[]).slice(0,6).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="card-footer">
        <span>${formatDate(p.startDate)}</span>
        ${p.link?`<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener">Abrir enlace ↗</a>`:"<span>Sin enlace</span>"}
      </div>
    </article>`).join(""):`<div class="empty"><div><h3>No encontramos proyectos</h3><p>Crea uno nuevo o cambia los filtros de búsqueda.</p></div></div>`;
}

function getFilteredIdeas(){
  const q=$("#ideaSearch").value.trim().toLowerCase();
  const category=$("#ideaCategoryFilter").value;
  const feasibility=$("#ideaFeasibilityFilter").value;
  return [...state.data.ideas].filter(i=>{
    const hay=[i.title,i.notes,i.category].join(" ").toLowerCase();
    return hay.includes(q)&&(category==="Todas"||i.category===category)&&(feasibility==="Todas"||i.feasibility===feasibility);
  }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
}

function renderIdeas(){
  const categories=[...new Set(state.data.ideas.map(i=>i.category).filter(Boolean))].sort();
  const current=$("#ideaCategoryFilter").value||"Todas";
  $("#ideaCategoryFilter").innerHTML=`<option value="Todas">Todas las categorías</option>${categories.map(c=>`<option ${c===current?"selected":""}>${escapeHtml(c)}</option>`).join("")}`;
  const list=getFilteredIdeas();
  $("#ideaResultText").textContent=`${list.length} idea${list.length===1?"":"s"}`;
  $("#ideasGrid").innerHTML=list.length?list.map(i=>`
    <article class="idea-card">
      <div class="card-top">
        <div>
          <div class="tags">
            <span class="tag">${escapeHtml(i.category)}</span>
            <span class="badge ${feasibilityClass(i.feasibility)}">${escapeHtml(i.feasibility)}</span>
          </div>
          <h3>${escapeHtml(i.title)}</h3>
          <p>${escapeHtml(i.notes||"Sin notas adicionales.")}</p>
        </div>
        <div class="card-actions">
          <button class="mini-btn" data-edit-idea="${i.id}" title="Editar"><i data-lucide="pencil"></i></button>
          <button class="mini-btn" data-delete-idea="${i.id}" title="Eliminar"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="card-footer">
        <span>${formatDate(i.createdAt.slice(0,10))}</span>
        <button class="link-btn" data-convert-idea="${i.id}">Convertir en proyecto <i data-lucide="arrow-up-right"></i></button>
      </div>
    </article>`).join(""):`<div class="empty"><div><h3>No encontramos ideas</h3><p>Registra una nueva idea o cambia los filtros.</p></div></div>`;
}

function openProject(project=null){
  $("#projectForm").reset();
  $("#projectId").value=project?.id||"";
  $("#projectDialogTitle").textContent=project?"Editar proyecto":"Nuevo proyecto";
  $("#projectName").value=project?.name||"";
  $("#projectDescription").value=project?.description||"";
  $("#projectStatus").value=project?.status||"Idea";
  $("#projectStartDate").value=project?.startDate||today();
  $("#projectTechnologies").value=(project?.technologies||[]).join(", ");
  $("#projectLink").value=project?.link||"";
  $("#projectDialog").showModal();
}

function openIdea(idea=null){
  $("#ideaForm").reset();
  $("#ideaId").value=idea?.id||"";
  $("#ideaDialogTitle").textContent=idea?"Editar idea":"Nueva idea";
  $("#ideaTitle").value=idea?.title||"";
  $("#ideaNotes").value=idea?.notes||"";
  $("#ideaCategory").value=idea?.category||"Aplicación web";
  $("#ideaFeasibility").value=idea?.feasibility||"Media";
  $("#ideaDialog").showModal();
}

$("#projectForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#projectId").value;
  const existing=state.data.projects.find(p=>p.id===id);
  const item={
    id:id||uid(),
    name:$("#projectName").value.trim(),
    description:$("#projectDescription").value.trim(),
    status:$("#projectStatus").value,
    startDate:$("#projectStartDate").value,
    technologies:$("#projectTechnologies").value.split(",").map(x=>x.trim()).filter(Boolean),
    link:$("#projectLink").value.trim(),
    createdAt:existing?.createdAt||now(),
    updatedAt:now()
  };
  if(id) state.data.projects=state.data.projects.map(p=>p.id===id?item:p);
  else state.data.projects.push(item);
  $("#projectDialog").close();
  save(id?"Proyecto actualizado.":"Proyecto creado.");
});

$("#ideaForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#ideaId").value;
  const existing=state.data.ideas.find(i=>i.id===id);
  const item={
    id:id||uid(),
    title:$("#ideaTitle").value.trim(),
    notes:$("#ideaNotes").value.trim(),
    category:$("#ideaCategory").value.trim(),
    feasibility:$("#ideaFeasibility").value,
    createdAt:existing?.createdAt||now(),
    updatedAt:now()
  };
  if(id) state.data.ideas=state.data.ideas.map(i=>i.id===id?item:i);
  else state.data.ideas.push(item);
  $("#ideaDialog").close();
  save(id?"Idea actualizada.":"Idea guardada.");
});

$("#quickIdeaForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.data.ideas.push({
    id:uid(),title:$("#quickIdeaTitle").value.trim(),notes:"",
    category:$("#quickIdeaCategory").value,feasibility:$("#quickIdeaFeasibility").value,
    createdAt:now(),updatedAt:now()
  });
  e.target.reset();
  $("#quickIdeaFeasibility").value="Media";
  save("Idea rápida guardada.");
});

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-view]");
  if(nav) setView(nav.dataset.view);
  const go=e.target.closest("[data-go]");
  if(go) setView(go.dataset.go);

  const ep=e.target.closest("[data-edit-project]");
  if(ep) openProject(state.data.projects.find(p=>p.id===ep.dataset.editProject));
  const dp=e.target.closest("[data-delete-project]");
  if(dp&&confirm("¿Eliminar este proyecto?")){
    state.data.projects=state.data.projects.filter(p=>p.id!==dp.dataset.deleteProject);save("Proyecto eliminado.");
  }
  const ei=e.target.closest("[data-edit-idea]");
  if(ei) openIdea(state.data.ideas.find(i=>i.id===ei.dataset.editIdea));
  const di=e.target.closest("[data-delete-idea]");
  if(di&&confirm("¿Eliminar esta idea?")){
    state.data.ideas=state.data.ideas.filter(i=>i.id!==di.dataset.deleteIdea);save("Idea eliminada.");
  }
  const ci=e.target.closest("[data-convert-idea]");
  if(ci){
    const idea=state.data.ideas.find(i=>i.id===ci.dataset.convertIdea);
    state.data.projects.push({
      id:uid(),name:idea.title,description:idea.notes||`Proyecto creado desde la idea: ${idea.title}`,
      status:"En Desarrollo",startDate:today(),technologies:[],link:"",
      createdAt:now(),updatedAt:now()
    });
    state.data.ideas=state.data.ideas.filter(i=>i.id!==idea.id);
    save("Idea convertida en proyecto.");
    setView("projects");
  }
});

["projectSearch","projectStatusFilter","projectSort"].forEach(id=>$("#"+id).addEventListener("input",renderProjects));
["ideaSearch","ideaCategoryFilter","ideaFeasibilityFilter"].forEach(id=>$("#"+id).addEventListener("input",renderIdeas));

$("#newProjectBtn").onclick=()=>openProject();
$("#heroProjectBtn").onclick=()=>openProject();
$("#newIdeaBtn").onclick=()=>openIdea();
$("#heroIdeaBtn").onclick=()=>openIdea();
$("#primaryAction").onclick=()=>{
  if(state.view==="ideas") openIdea();
  else if(state.view==="backups") exportData();
  else openProject();
};

function exportData(){
  const blob=new Blob([JSON.stringify(state.data,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`projectflow-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Respaldo exportado.");
}
$("#exportBtn").onclick=exportData;
$("#importBtn").onclick=()=>$("#importInput").click();
$("#importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed.projects)||!Array.isArray(parsed.ideas)) throw new Error();
    if(confirm("Aceptar reemplazará los datos actuales. Cancelar combinará ambos respaldos.")){
      state.data={projects:parsed.projects,ideas:parsed.ideas,updatedAt:now()};
    }else{
      const projectMap=new Map([...state.data.projects,...parsed.projects].map(x=>[x.id||uid(),x]));
      const ideaMap=new Map([...state.data.ideas,...parsed.ideas].map(x=>[x.id||uid(),x]));
      state.data={projects:[...projectMap.values()],ideas:[...ideaMap.values()],updatedAt:now()};
    }
    save("Datos importados correctamente.");
  }catch{toast("El archivo no es un respaldo válido.");}
  e.target.value="";
});
$("#resetBtn").onclick=()=>{
  if(confirm("Esta acción eliminará todos los proyectos e ideas. ¿Continuar?")){
    state.data={projects:[],ideas:[],updatedAt:now()};save("Workspace restablecido.");
  }
};

$("#menuBtn").onclick=()=>{$("#sidebar").classList.add("open");$("#overlay").classList.add("open")};
$("#overlay").onclick=()=>{$("#sidebar").classList.remove("open");$("#overlay").classList.remove("open")};

document.addEventListener("DOMContentLoaded",()=>{
  load();
  lucide.createIcons();
});
