// Tippy
import tippy from 'tippy.js';

export default class TippyBox {
    constructor(){
      const
        tooltipElements = document.querySelectorAll('[data-tooltip]');

      [].forEach.call(tooltipElements, HTMLElement => {
        HTMLElement.addEventListener('mouseover', this.setTooltip(HTMLElement));
      });
    }

    // Tippy.jsを利用しTooltip作成
    setTooltip(el){
        const
            content = el.getAttribute('data-tooltip'),
            link = el.getAttribute('data-link'),
            template = this.prepareTemplate(content, link),
            refProps = el.getBoundingClientRect();
        tippy(el, {
        content: template.innerHTML,
        allowHTML: true,
        animation: 'fade',
        interactive: true,
        duration: [200,100],
        theme: 'brown',
        placement: 'top',
        appendTo: document.body,
        maxWidth: '15rem',
        delay: [2, 100],
        offset: [this.skidding(refProps), 0 ],
        });
    };
  
  prepareTemplate(content, link) {
    const
      template = document.querySelector("#tooltip"),
      contentP = template.content.children[0],
      linkA = template.content.children[2];

    contentP.innerText = content;
    if(link === "undefined"){ //詳細情報のリンクが無い場合、<a>要素を空にする
      linkA.innerText = null;
      linkA.removeAttribute('href');
    }
    else {
      linkA.innerText = "Read More";
      linkA.href = link;
    }

    return template;
  };

  skidding(props){
    return props.width * 0.15 < 10 ? props.width * 0.1 : props.width * 0.2;
  };

}
