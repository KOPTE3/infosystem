import * as path from 'path';


const root = process.cwd();

export default {
	root,
	datastoreRoot: path.resolve(root, 'datastore'),
	templatesRoot: path.resolve(root, 'templates'),
	distRoot: path.resolve(root, 'dist'),

	mainWindow: null,
};
