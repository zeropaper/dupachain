import "./style.css";

import { PersonaRun } from "./dc-persona-run";

declare global {
  interface Window {
    app: HTMLDivElement;
  }
}

const { app } = window;

function flipMessageRole(message: any) {
  return {
    ...message,
    role: message.role === "user" ? "assistant" : "user",
  };
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
type Info = {
  setup: any;
  output: Record<string, Record<string, { messages: any }>>;
};
async function initEval(id: string) {
  const data = await fetch(`/api/evals/${id}`).then(
    (res) => res.json() as Promise<Info>,
  );
  app.textContent = "";
  const container = document.createElement("div");
  app.appendChild(container);

  const setupDetailsEl = document.createElement("details");
  setupDetailsEl.open = false;
  container.appendChild(setupDetailsEl);

  const setupSummaryEl = document.createElement("summary");
  setupSummaryEl.textContent = "Runners";
  setupDetailsEl.appendChild(setupSummaryEl);

  const runnersEl = document.createElement("pre");
  runnersEl.classList.add("runners");
  runnersEl.textContent = JSON.stringify(data.setup.runners, null, 2);
  setupDetailsEl.appendChild(runnersEl);

  for (const [promptPath, personas] of Object.entries(data.output)) {
    const subContainer = document.createElement("div");
    subContainer.classList.add("prompt-container");
    container.appendChild(subContainer);

    const promptTitleEl = document.createElement("h2");
    promptTitleEl.textContent = `Prompt: ${promptPath.split("/").at(-1)}`;
    const promptEl = document.createElement("pre");
    promptEl.classList.add("prompt");
    promptEl.textContent = data.setup.prompts.find(
      (p: any) => p.path === promptPath,
    )?.prompt;
    subContainer.appendChild(promptTitleEl);
    subContainer.appendChild(promptEl);

    const personasContainer = document.createElement("div");
    personasContainer.classList.add("personas-container");
    subContainer.appendChild(personasContainer);
    for (const [personaName, info] of Object.entries(personas)) {
      const personaRunEl = new PersonaRun();
      personasContainer.appendChild(personaRunEl);
      personaRunEl.personaName = personaName;
      personaRunEl.messages = info.messages
        .map((msg: any, i: number) => ({
          id: i.toString(),
          ...msg,
        }))
        .map(flipMessageRole);
    }
  }
}

export async function init() {
  const route = window.location.pathname;
  if (route.startsWith("/evals/")) {
    await initEval(route.split("/").at(2) || "");
    return;
  }
  await initIndex();
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
