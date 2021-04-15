import tippy from "tippy.js";
// All data with [data-tooltip-id] gets tooltip
export default class TippyBox {
  constructor() {
    const tooltipElements = document.querySelectorAll("[data-tooltip-id]"),
      data = this.getData();

    tooltipElements.forEach((HTMLElement) => {
      HTMLElement.addEventListener(
        "mouseover",
        this.setTooltip(HTMLElement, data)
      );
    });
  }

  // Tooltip data is stored in /assets/tooltips.json, id = [data-tooltip-id]
  getData() {
    const json = require("../../assets/tooltips.json");
    Object.freeze(json);

    return json;
  }
  // Set tooltip with tippy.js plugin
  setTooltip(el, data) {
    const id = el.getAttribute("data-tooltip-id");
    try {
      const tooltip = data.find((entry) => entry.id === id),
        template = this.createTemplate(tooltip);

      tippy(el, {
        content: template.innerHTML,
        allowHTML: true,
        animation: "fade",
        duration: [400],
        interactive: true,
        theme: "black",
        placement: "right",
        appendTo: document.body,
        maxWidth: "15rem",
        delay: [2, 300],
        offset: this.offset(el),
      });
    } catch (err) {
      console.log(
        `Failed to set the tooltip for item with a data-tooltip id of [${id}].\nCheck if there is corresponding data in tooltips.JSON`
      );
    }
  }
  // HTML template for inside Tippy
  createTemplate(tooltip) {
    const template = document.createElement("span"),
      contentP = document.createElement("p");

    contentP.className = "content";
    contentP.innerText = tooltip.content;
    // <a> tag will only be set when there is an URL in JSON file
    if ("url" in tooltip) contentP.appendChild(this.createAnchor(tooltip.url));
    template.appendChild(contentP);

    return template;
  }

  createAnchor(url) {
    const anchor = document.createElement("a");

    anchor.className = "url";
    anchor.href = url;
    anchor.innerText = "Read More";

    return anchor;
  }

  // Calculate offset based on props if rotated, otherwise return default
  offset(el) {
    const style = window.getComputedStyle(el),
      props = el.getBoundingClientRect();

    if (style.transform === "none") return [3, 7];
    return [props.width * 0.15 < 10 ? props.width * 0.1 : props.width * 0.2, 2];
  }
}
