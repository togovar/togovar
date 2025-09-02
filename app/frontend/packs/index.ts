// Import stylesheets
import '../stylesheets/main.sass';

// Import modules
import { PAGE } from '../src/global.js';
import { initHome } from '../src/home.js';

// Import assets
import '!file-loader?name=[name].[ext]!../images/favicon.svg';
import '!file-loader?name=[name].[ext]!../assets/togovar.jsonld';
import '!file-loader?name=js/components/[name].[ext]!../src/components/LogarithmizedBlockGraphFrequencyView.js';

// Initialization function
function init(): void {
  if (PAGE === 'home') {
    initHome();
  }
}

// DOM Ready check (without jQuery)
const isReady: boolean =
  document.readyState === 'complete' || document.readyState === 'interactive';

if (isReady) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
