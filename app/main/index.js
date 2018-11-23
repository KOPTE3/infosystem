import MenuBuilder from './menu';
import config from './config';


import './disciplines';
import './specialties';
import './competencies';

import './gen/academic-plan';
import './gen/academic-table';
import './gen/competencies-matrix';
import './gen/print-plans';


const log = require('electron-log');

export default function boot (mainWindow) {
	const menuBuilder = new MenuBuilder(mainWindow);
	menuBuilder.buildMenu();

	log.info('App config', config);

	config.mainWindow = mainWindow;
}
