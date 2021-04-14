import "../stylesheets/main.sass";

import 'jquery'
import 'jquery-ui/ui/widget'
import 'jquery-ui/ui/data'
import 'jquery-ui/ui/scroll-parent'
import 'jquery-ui/ui/widgets/draggable'
import 'jquery-ui/ui/widgets/mouse'
import 'jquery-deparam'

import {PAGE} from '../javascripts/global.js';
import {initHome} from '../javascripts/home.js';

// Load the favicon
import '!file-loader?name=[name].[ext]!../images/favicon.svg';
import '!file-loader?name=[name].[ext]!../assets/togovar.jsonld';

let isReady =
  document.readyState === 'complete' ||
  (document.readyState !== 'loading' &&
    !document.documentElement.doScroll);
if (isReady) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

function init() {

  switch (PAGE) {
    case 'home':
      initHome();
      break;
    case 'variant':
      break;
  }
}
