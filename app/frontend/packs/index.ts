// Import stylesheets
import '../stylesheets/main.sass';

// Import modules
import { PAGE } from '../src/global';

// Import assets
import '!file-loader?name=[name].[ext]!../images/favicon.svg';
import '!file-loader?name=[name].[ext]!../assets/togovar.jsonld';
import '!file-loader?name=js/components/[name].[ext]!../src/components/LogarithmizedBlockGraphFrequencyView.js';

// Initialization function
async function init(): Promise<void> {
  if (PAGE === 'home') {
    try {
      const homeModule = await import('../src/home');
      homeModule.initHome();
    } catch (error) {
      console.error('Failed to import home module:', error);
    }
  }
} // DOM Ready check
const isReady: boolean =
  document.readyState === 'complete' || document.readyState === 'interactive';

if (isReady) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
