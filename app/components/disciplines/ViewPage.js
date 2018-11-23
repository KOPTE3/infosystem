import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ArrowBack from '@material-ui/icons/ArrowBack';
import EditIcon from '@material-ui/icons/Edit';
import Icon from '@material-ui/core/Icon';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import ReactTable from 'react-table';
import scheme from '../../scheme';
import { lessonTypes, partTypeMap } from '../../store/common';
import styles from './disciplines.scss';


export default class DisciplinesViewPage extends Component {
	constructor (props) {
		super(props);

		const { disc_id, dir_id } = this.props.match.params;

		this.state = {
			id: disc_id,
			direction_id: dir_id,
			direction: null,
			competencies: [],
			specialties: [],
		};

		this.onEdit = this.onEdit.bind(this);
		this.onExport = this.onExport.bind(this);
		this.onImport = this.onImport.bind(this);
	}

	componentDidMount () {
		this.loadData()
			.catch(console.error);
	}

	async onExport () {
		const { id } = this.state;
		try {
			await promiseIpc.send('export-discipline', { _id: id });
		} catch (e) {
			console.error(e);
		}
	}

	async onImport () {
		const { id } = this.state;
		try {
			await promiseIpc.send('import-discipline', { _id: id });
		} catch (e) {
			console.error(e);
		}
	}

	async loadData () {
		const { id, direction_id } = this.state;
		const disciplines = await promiseIpc.send('query-disciplines', { _id: id });
		const competencies = await promiseIpc.send('query-competencies', { direction_id });
		const competencies_all = competencies.reduce((all, item) => {
			all[ item._id ] = item;
			return all;
		}, {});
		this.setState({
			discipline: disciplines[ 0 ],
			competencies,
			competencies_all,
		});
	}

	onEdit (id) {
		const { direction_id } = this.state;
		this.props.history.push(`/directions/${direction_id}/disciplines/${id}/edit`);
	}

	getBar () {
		const { discipline, id, direction_id } = this.state;
		let header = null;
		if (discipline) {
			header = <React.Fragment>{discipline.name}</React.Fragment>;
		} else {
			header = <React.Fragment>Дисциплина</React.Fragment>;
		}

		return (
			<AppBar position="static">
				<Toolbar>
					<Typography variant="title" color="inherit">
						<IconButton onClick={() => this.props.history.push(`/directions/${direction_id}`)}>
							<ArrowBack/>
						</IconButton>
						{header}
					</Typography>

					<Button onClick={() => this.onEdit(id)} mini variant="fab" color="white"
					        title="Редактировать данные о дисциплине"
					        classes={{ fab: styles.add }}>
						<EditIcon/>
					</Button>

					<Button onClick={() => this.onExport(id)} mini variant="fab" color="white"
					        title="Экспортировать данные о дисциплине"
					        classes={{ fab: styles.addLeftMargin }}>
						<Icon>save_alt</Icon>
					</Button>

					<Button onClick={() => this.onImport(id)} mini variant="fab" color="white"
					        title="Импортировать данные о дисциплине"
					        classes={{ fab: styles.addLeftMargin }}>
						<Icon>note_add</Icon>
					</Button>
				</Toolbar>
			</AppBar>
		);
	}

	content () {
		const { discipline } = this.state;

		if (!discipline) {
			return null;
		}

		return (
			<div className={[ styles.contentWrapper, styles.contentWrapperMargin ].join(' ')}>
				<Paper classes={{ root: styles.content }}>
					{
						scheme.disciplines.fields.map(function({ name, description, type }) {
							if (type === 'hidden') {
								return null;
							}

							if (type === 'competencies') {
								const { competencies_all } = this.state;
								let values = discipline[ name ];

								return (
									<div key={name}>
										<Typography color="inherit" variant="body2">{description}</Typography>
										<List>
											{
												values.map(v => {
													const { _id, know, able_to, own } = v;
													const c = competencies_all[ _id ];
													return (
														<div className={styles.compListItem} key={_id}>
															<ListItemText
																primary={c.code}
																secondary={c.description}
															/>
															<List>
																{
																	[
																		[ 'know', 'Знать' ],
																		[ 'able_to', 'Уметь' ],
																		[ 'own', 'Владеть' ],
																	].map(item => {
																		return (
																			<div className={styles.compListItemHalf} key={item[ 0 ]}>
																				<ListItemText
																					primary={item[ 1 ]}
																				/>
																				<ul>
																					{
																						v[ item[ 0 ] ].map(text => {
																							return (
																								<li>{text}</li>
																							);
																						})
																					}
																				</ul>
																			</div>
																		);
																	})
																}
															</List>
														</div>
													);
												})
											}
										</List>
									</div>
								);
							}
							if (type === 'part_type') {
								return (
									<div key={name}>
										<Typography color="inherit" variant="body2">{description}</Typography>
										<Typography color="inherit"
										            variant="body1">{partTypeMap[ discipline[ name ] ][ 0 ]}</Typography>
									</div>
								);
							}
							if (type === 'boolean') {
								return (
									<div key={name}>
										<Typography color="inherit" variant="body2">{description}</Typography>
										<Typography color="inherit"
										            variant="body1">{discipline[ name ] ? '+' : '-'}</Typography>
									</div>
								);
							}
							return (
								<div key={name}>
									<Typography color="inherit" variant="body2">{description}</Typography>
									<Typography color="inherit" variant="body1">{discipline[ name ]}</Typography>
								</div>
							);
						}.bind(this))
					}
				</Paper>

				<Paper classes={{ root: styles.content }}>
					{this.structure()}
				</Paper>
			</div>
		);
	}

	getDisciplineSemestersColumns () {
		// number, exam, teacher_time, self_time, time, exam_time
		return [
			{
				Header: 'Номер семестра',
				accessor: 'number',
			},
			{
				Header: 'Экзамен / зачёт',
				id: 'exam',
				accessor: item => {
					if (!item.exam) {
						return '-';
					}
					return lessonTypes[ item.exam ].full;
				},
			},
			{
				Header: 'Трудоёмкость (зач. ед.)',
				accessor: 'time',
			},
			{
				Header: 'Время, выделяемое на работу с преподавателями',
				accessor: 'teacher_time',
			},
			{
				Header: 'Время на самостоятельную работу',
				accessor: 'self_time',
			},
			{
				Header: 'Время, выделяемое на экзамены и зачёты',
				accessor: 'exam_time',
			},
		];
	}

	structure () {
		const { discipline } = this.state;

		return (
			<React.Fragment>
				<Typography variant="title" color="inherit">
					Структура семестров
				</Typography>
				<ReactTable
					data={discipline.constraints.semesters}
					columns={this.getDisciplineSemestersColumns()}
					defaultPageSize={discipline.constraints.semesters.length}
					sortable={false}
					multiSort={false}
					showPagination={false}
					showPaginationTop={false}
					showPaginationBottom={false}
					showPageSizeOptions={false}
					showPageJump={false}
					className="-highlight"
				/>
			</React.Fragment>
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
