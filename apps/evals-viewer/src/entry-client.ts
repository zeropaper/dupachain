import "./style.css";

import type {
  EvalOutput,
  EvalPersonaMap,
  EvalPromptMap,
  ConfigSchema,
} from "./types";
import { ChatMessagesElement } from "@local/ui/src/dc-chat-messages";

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

function flipMessageRole(message: any, index: number) {
  return {
    ...message,
    created_at: "",
    id: `${index}`,
    role: message.role === "user" ? "assistant" : "user",
  };
}

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

type Info = {
  setup: ConfigSchema;
  output: EvalOutput;
};
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

function renderConfig(data: any, container: HTMLElement) {
  const details = document.createElement("details");
  container.appendChild(details);
  const summary = document.createElement("summary");
  summary.textContent = "Config";
  details.appendChild(summary);
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  details.appendChild(pre);
  container.appendChild(details);
}

function renderData(data: Info, runnersContainer: HTMLDivElement) {
  Object.entries(data.output).forEach(([runnerHash, runnerInfo], index) => {
    const runnerConfig = data.setup.runners[index];
    const runnerWrapper = document.createElement("div");
    runnerWrapper.classList.add("runner");
    runnersContainer.appendChild(runnerWrapper);

    const runnerTitle = document.createElement("h1");
    runnerTitle.textContent = `Runner: ${runnerHash}`;
    runnerWrapper.appendChild(runnerTitle);

    renderConfig(runnerConfig, runnerWrapper);

    const promptsContainer = document.createElement("div");
    promptsContainer.classList.add("prompts");
    runnerWrapper.appendChild(promptsContainer);

    renderRunner(runnerInfo, data.setup, promptsContainer);
  });
}

function renderRunner(
  runnerInfo: EvalPromptMap,
  config: ConfigSchema,
  promptsContainer: HTMLDivElement,
) {
  Object.entries(runnerInfo).forEach(([promptHash, promptInfo], index) => {
    const promptConfig = config.prompts[index];
    const promptWrapper = document.createElement("div");
    promptWrapper.classList.add("prompt");
    promptsContainer.appendChild(promptWrapper);

    const promptTitle = document.createElement("h2");
    promptTitle.textContent = `Prompt: ${promptHash}`;
    promptWrapper.appendChild(promptTitle);

    renderConfig(promptConfig, promptWrapper);

    const personasContainer = document.createElement("div");
    personasContainer.classList.add("personas");
    promptWrapper.appendChild(personasContainer);

    renderPrompt(promptInfo, config, personasContainer);
  });
}

function renderPrompt(
  promptInfo: EvalPersonaMap,
  config: ConfigSchema,
  personasContainer: HTMLDivElement,
) {
  Object.entries(promptInfo).forEach(([personaHash, personaInfo], index) => {
    const personaConfig = config.personas[index];
    const personaWrapper = document.createElement("div");
    personaWrapper.classList.add("persona");
    personasContainer.appendChild(personaWrapper);

    const personaTitle = document.createElement("h3");
    personaTitle.textContent = `Persona ${personaHash}`;
    personaWrapper.appendChild(personaTitle);

    renderConfig(personaConfig, personaWrapper);

    const info = document.createElement("div");
    const events = personaInfo.log.reduce(
      (acc, [timestamp, id, eventName, ...rest]) => {
        const actor = id.split(" ").slice(1).join(" ");
        acc[actor] = acc[actor] || {};
        acc[actor][eventName] = acc[actor][eventName] || 0;
        acc[actor][eventName]++;
        return acc;
      },
      {} as Record<string, any>,
    );
    const errors = personaInfo.log.reduce(
      (arr, [timestamp, id, eventName, ...rest]) => {
        if (eventName === "error") {
          arr.push([id, eventName, ...rest]);
        }
        return arr;
      },
      [] as any[],
    );
    info.innerHTML = `<pre>${JSON.stringify(
      {
        events,
        errors,
      },
      null,
      2,
    )}</pre>`;
    personaWrapper.appendChild(info);

    const details = document.createElement("details");
    personaWrapper.appendChild(details);
    const summary = document.createElement("summary");
    summary.textContent = "Messages";
    details.appendChild(summary);
    const messagesEl = new ChatMessagesElement();
    messagesEl.setMessages(personaInfo.messages.map(flipMessageRole));
    details.appendChild(messagesEl);
  });
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
