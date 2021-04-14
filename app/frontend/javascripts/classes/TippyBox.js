import tippy from "tippy.js";
// All data with [data-tooltip-id] attribute will be assigned a tooltip
// Tooltip data is stored in /assets/tooltips.json using the [data-tooltip-id] as key
export default class TippyBox {
  constructor() {
    const tooltipElements = document.querySelectorAll("[data-tooltip-id]"),
      data = this.getData();

    [].forEach.call(tooltipElements, (HTMLElement) => {
      HTMLElement.addEventListener(
        "mouseover",
        this.setTooltip(HTMLElement, data)
      );
    });
  }

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
        template = this.createTemplate(tooltip),
        refProps = el.getBoundingClientRect();

      tippy(el, {
        content: template.innerHTML,
        allowHTML: true,
        interactive: true,
        duration: 300,
        theme: "brown",
        placement: "top",
        appendTo: document.body,
        maxWidth: "15rem",
        delay: [2, 200],
        offset: [this.skidding(refProps), 0],
      });
    } catch (err) {
      // Log error if there is no tooltip info in JSON file
      console.log(
        `Failed to set the tooltip for item with a data-tooltip id of [${id}].\nCheck if there is corresponding data in tooltips.JSON`
      );
    }
  }
  // Tippy utilizes below HTML template to set content of the tooltip
  createTemplate(tooltip) {
    const template = document.createElement("span"),
      contentP = document.createElement("p");

    contentP.className = "content";
    contentP.innerText = tooltip.content;
    // <a> tag will only be set when there is a URL attribute in JSON file
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

  skidding(props) {
    return props.width * 0.15 < 10 ? props.width * 0.1 : props.width * 0.2;
  }
}
