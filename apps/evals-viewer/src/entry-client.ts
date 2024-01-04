import { renderData } from "./renderers";
import "./style.css";

import { Info } from "./types";

declare global {
  interface Window {
    app: HTMLDivElement;
  }
}

const { app } = window;
const navEl =
  document.querySelector("#app>nav") ?? document.createElement("nav");
const mainEl =
  document.querySelector("#app>main") ?? document.createElement("main");

async function initIndex() {
  const data = await fetch("/api/evals").then((res) => res.json());
  navEl.textContent = "";
  data.forEach(({ id, summary }: { id: string; summary: any }) => {
    const link = document.createElement("a");
    link.href = `/evals/${id}`;
    link.onclick = (e) => {
      e.preventDefault();
      window.history.pushState({}, "", link.href);
      init();
    };
    link.textContent = id;

    const wrapper = document.createElement("div");
    navEl.appendChild(wrapper);

    wrapper.appendChild(link);

    const info = document.createElement("div");
    info.innerHTML = `<small>Runners: ${summary.runners}, Prompts: ${summary.prompts}, Personas: ${summary.personas}</small>`;
    wrapper.appendChild(info);
  });
}

async function initEval(id: string) {
  const data = await fetch(`/api/evals/${id}`).then(
    (res) => res.json() as Promise<Info>,
  );
  mainEl.textContent = "";

  const runnersContainer = document.createElement("div");
  runnersContainer.classList.add("runners");
  mainEl.appendChild(runnersContainer);

  renderData(data, runnersContainer);
}

export async function init() {
  const route = window.location.pathname;

  if (navEl.parentElement !== app) {
    app.appendChild(navEl);
    app.appendChild(mainEl);
    await initIndex();
  }

  if (route.startsWith("/evals/")) {
    await initEval(route.split("/").at(2) || "");
  }
}

window.addEventListener("DOMContentLoaded", init);

window.addEventListener("popstate", init);

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      newModule.init();
    }
  });
}
