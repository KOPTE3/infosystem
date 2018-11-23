import promiseIpc from 'electron-promise-ipc';
import db from '../db';


const log = require('electron-log');

const LOG = log.debug.bind(log, '[competencies]');

promiseIpc.on('query-competencies', async (query) => {
	const competencies = await db.competencies.find(query || {});
	LOG(competencies);

	return competencies;
});

promiseIpc.on('save-competency', async (data) => {
	LOG('save', data);

	if (!data._id) {
		await db.competencies.insert(data);
	} else {
		LOG('update');
		await db.competencies.update({ _id: data._id }, data, {});
	}

	return 'success';
});


promiseIpc.on('query-directions', async (query) => {
	const directions = await db.directions.find(query || {});
	LOG(directions);

	return directions;
});

promiseIpc.on('save-direction', async (data) => {
	LOG('save', data);

	if (!data._id) {
		await db.directions.insert(data);
	} else {
		LOG('update');
		await db.directions.update({ _id: data._id }, data, {});
	}

	return 'success';
});

promiseIpc.on('query-specialties', async (query) => {
	const competencies = await db.specialties.find(query || {});
	LOG(competencies);

	return competencies;
});

promiseIpc.on('save-specialty', async (data) => {
	LOG('save', data);

	if (!data._id) {
		await db.specialties.insert(data);
	} else {
		LOG('update');
		await db.specialties.update({ _id: data._id }, data, {});
	}

	return 'success';
});

promiseIpc.on('query-disciplines', async (query) => {
	const disciplines = await db.disciplines.find(query || {});
	LOG(disciplines);

	return disciplines;
});

promiseIpc.on('save-discipline', async (data) => {
	LOG('save', data);

	if (!data._id) {
		await db.disciplines.insert(data);
	} else {
		LOG('update');
		await db.disciplines.update({ _id: data._id }, data, {});
	}

	return 'success';
});
