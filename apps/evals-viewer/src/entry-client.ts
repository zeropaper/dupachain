import "./style.css";
import "./typescript.svg";
import { setupCounter } from "./counter";

export function init() {
  console.log("init.");
  setupCounter(document.querySelector("#counter") as HTMLButtonElement);
}

init();

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // newModule is undefined when SyntaxError happened
      // console.log("updated: init is now ", newModule.init);
      // newModule.init();
    }
  });
}
