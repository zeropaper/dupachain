import "./style.css";

declare global {
  interface Window {
    app: HTMLDivElement;
  }
}

async function initIndex() {
  const data = await fetch("/api/evals").then((res) => res.json());
  app.textContent = "";
  data.files.forEach((file: string) => {
    const link = document.createElement("a");
    link.href = `/evals/${file}`;
    link.onclick = (e) => {
      e.preventDefault();
      window.history.pushState({}, "", link.href);
      init();
    };
    link.textContent = file;
    const wrapper = document.createElement("div");
    wrapper.appendChild(link);
    app.appendChild(wrapper);
  });
}

async function initEval(id: string) {
  const data = await fetch(`/api/evals/${id}`).then((res) => res.json());
  app.textContent = "";
  console.info(data);
}

const { app } = window;
export async function init() {
  const route = window.location.pathname;
  if (route.startsWith("/evals/")) {
    await initEval(route.split("/").at(2) || "");
    return;
  }
  await initIndex();
}

window.addEventListener("DOMContentLoaded", () => {
  init();
});

window.addEventListener("popstate", () => {
  init();
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // newModule is undefined when SyntaxError happened
      // console.log("updated: init is now ", newModule.init);
      newModule.init();
    }
  });
}
