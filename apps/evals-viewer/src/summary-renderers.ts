import type {
  EvalPersonaMap,
  EvalPromptMap,
  ConfigSchema,
  Info,
  EvalPersonaResult,
} from "./types";

function logContainsError(log: EvalPersonaResult["log"]) {
  return log.find(([, , type]) => type === "error");
}

export function renderSummaryData(
  data: Info,
  runnersContainer: HTMLDivElement,
) {
  console.info("data", data);
  Object.entries(data.output).forEach(([runnerHash, runnerInfo], index) => {
    const runnerConfig = data.setup.runners[index];
    const runnerWrapper = document.createElement("div");
    runnerWrapper.classList.add("runner");
    runnersContainer.appendChild(runnerWrapper);
    const link = document.createElement("a");
    link.href = `#runner-${runnerHash}`;
    link.textContent = `${runnerConfig.modelName} ${runnerConfig.path
      .split("/")
      .pop()}`;
    runnerWrapper.appendChild(link);

    const promptsContainer = document.createElement("div");
    promptsContainer.classList.add("prompts");
    runnerWrapper.appendChild(promptsContainer);

    renderSummaryRunner(runnerInfo, data.setup, promptsContainer);
  });
}

export function renderSummaryRunner(
  runnerInfo: EvalPromptMap,
  config: ConfigSchema,
  promptsContainer: HTMLDivElement,
) {
  Object.entries(runnerInfo).forEach(([promptHash, promptInfo], index) => {
    const promptConfig = config.prompts[index];
    const promptWrapper = document.createElement("div");
    promptWrapper.classList.add("prompt");
    promptsContainer.appendChild(promptWrapper);
    const link = document.createElement("a");
    link.href = `#prompt-${promptHash}`;
    link.textContent = `Prompt`;
    promptWrapper.appendChild(link);

    const personasContainer = document.createElement("div");
    personasContainer.classList.add("personas");
    promptWrapper.appendChild(personasContainer);

    renderSummaryPrompt(promptInfo, config, personasContainer);
  });
}

export function renderSummaryPrompt(
  promptInfo: EvalPersonaMap,
  config: ConfigSchema,
  personasContainer: HTMLDivElement,
) {
  Object.entries(promptInfo).forEach(([personaHash, personaInfo], index) => {
    const personaConfig = config.personas[index];
    console.info("persona", personaConfig, personaInfo);
    const personaWrapper = document.createElement("div");
    personaWrapper.classList.add("persona");
    if (logContainsError(personaInfo.log)) {
      personaWrapper.classList.add("error");
    }
    personasContainer.appendChild(personaWrapper);
    const link = document.createElement("a");
    link.href = `#persona-${personaHash}`;
    link.textContent = `${personaConfig.name}`;
    personaWrapper.appendChild(link);
  });
}
