import argv from './argv.js';

export default parseInt(argv.port || process.env.PORT || '8000', 10);
