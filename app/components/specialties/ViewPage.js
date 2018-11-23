import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import PrintIcon from '@material-ui/icons/Print';
import ArrowBack from '@material-ui/icons/ArrowBack';
import EditIcon from '@material-ui/icons/Edit';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import ReactTable from 'react-table';
import scheme from '../../scheme';
import { partTypeMap } from '../../store/common';
import styles from './specialties.scss';


export default class SpecialtiesViewPage extends Component<Props> {
	constructor (props) {
		super(props);

		const { dir_id, spec_id } = this.props.match.params;

		this.state = {
			dir_id: dir_id,
			spec_id: spec_id,
		};

		this.onEdit = this.onEdit.bind(this);
	}

	componentDidMount () {
		this.loadData()
			.catch(console.error);
	}

	async loadData () {
		const { dir_id, spec_id } = this.state;
		const [ specialty ] = await promiseIpc.send('query-specialties', { _id: spec_id });
		const competencies = await promiseIpc.send('query-competencies', { direction_id: dir_id });
		const disciplines = await promiseIpc.send('query-disciplines', { direction_id: dir_id });
		specialty.competencies = competencies.filter(competency => (specialty.competencies.indexOf(competency._id) > -1) || competency.common);
		specialty.disciplines = disciplines.filter(discipline => (specialty.disciplines.indexOf(discipline._id) > -1) || discipline.part_type !== 'variative');
		this.setState({
			specialty: specialty,
			competencies: competencies,
			disciplines: disciplines,
		});
	}

	onEdit (dir_id, spec_id) {
		this.props.history.push(`/directions/${dir_id}/specialties/${spec_id}/edit`);
	}

	getBar () {
		const { specialty, dir_id, spec_id } = this.state;
		let header = null;
		if (specialty) {
			header = <React.Fragment>{specialty.name}</React.Fragment>;
		} else {
			header = <React.Fragment>Специальность</React.Fragment>;
		}

		return (
			<AppBar position="static">
				<Toolbar>
					<Typography variant="title" color="inherit">
						<IconButton onClick={() => this.props.history.goBack()}>
							<ArrowBack/>
						</IconButton>
						{header}
					</Typography>

					{
						<Button onClick={() => this.onEdit(dir_id, spec_id)} mini variant="fab" color="white"
						        classes={{ fab: styles.add }}>
							<EditIcon/>
						</Button>
					}
				</Toolbar>
			</AppBar>
		);
	}

	getColumns (entity) {
		const { id } = this.state;

		const columns = scheme[ entity ].fields
			.map(({ name, description, type }) => {
				if (type === 'hidden') {
					return null;
				}
				let accessor = name;

				if (type === 'boolean') {
					accessor = item => item[ name ] ? '+' : '-';
				}

				if (type === 'part_type') {
					accessor = item => (partTypeMap[ item[ name ] ] || [])[ 0 ];
				}

				if (type === 'foreign') {
					accessor = item => {
						let value = item[ name ];
						if (!Array.isArray(value)) {
							value = [ value ];
						}

						const sources = this.state[ name ];

						return sources
							.filter(({ _id }) => value.indexOf(_id) > -1)
							.map(({ name: n, code }) => code || n)
							.join(', ');
					};
				}

				if (type === 'competencies') {
					accessor = item => {
						let value = item[ name ];
						if (!Array.isArray(value)) {
							value = [ value ];
						}

						const sources = this.state[ name ];

						return sources
							.filter(({ _id }) => value.some(v => v._id === _id))
							.map(({ name: n, code }) => code || n)
							.join(', ');
					};
				}

				return {
					Header: description,
					id: name,
					accessor,
				};
			})
			.filter(col => col);

		if (entity === 'disciplines') {
			columns.push({
				accessor: '_id',
				maxWidth: 29,
				width: 29,
				minWidth: 29,
				Cell: row => (
					<div
						onClick={() => this.print(row.value)}
						style={{
							lineHeight: '19px',
							height: 19,
							cursor: 'pointer',
						}}
					>
						<PrintIcon style={{ fontSize: 19 }}/>
					</div>
				),
			});
		}

		return columns;
	}

	async print (discipline_id) {
		try {
			const specialty_id = this.state.spec_id;
			console.log('Print учебный и академический планы по дисциплине', {discipline_id, specialty_id});

			await promiseIpc.send('print-plans', {discipline_id, specialty_id})
		} catch (e) {
			console.error(e);
		}
	}

	content () {
		const { dir_id, spec_id, specialty } = this.state;
		const { history } = this.props;

		if (!specialty) {
			return null;
		}

		return (
			<div className={[ styles.contentWrapper, styles.contentWrapperMargin ].join(' ')}>
				<Paper classes={{ root: styles.content }}>
					{
						scheme.specialties.fields.map(function({ name, description, type }) {
							if (type === 'hidden') {
								return null;
							}
							if (type === 'foreign' || type === 'competencies') {
								return (
									<div key={name}>
										<Typography color="inherit" variant="body2">{description}</Typography>
										<ReactTable
											data={specialty[ name ]}
											columns={this.getColumns(name)}
											defaultPageSize={10}
											className="-highlight"
										/>
									</div>
								);
							}
							return (
								<div key={name}>
									<Typography color="inherit" variant="body2">{description}</Typography>
									<Typography color="inherit" variant="body1">{specialty[ name ]}</Typography>
								</div>
							);
						}.bind(this))
					}

				</Paper>
				<Button onClick={async () => await promiseIpc.send('generate-academic-plan', spec_id)}
				        variant="contained" color="primary">
					Создать заглавный лист Учебного плана
				</Button>

				<Button onClick={async () => await promiseIpc.send('generate-academic-table', spec_id)}
				        variant="contained" color="primary">
					Создать план учебного процесса
				</Button>

				<Button onClick={async () => await promiseIpc.send('generate-competencies-matrix', spec_id)}
				        variant="contained" color="primary">
					Создать матрицу компетенций
				</Button>
			</div>
		);
	}

	render () {
		return (
			<div>
				{this.getBar()}
				{this.content()}
			</div>
		);
	}
}
