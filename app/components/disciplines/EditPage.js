import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import InputAdornment from '@material-ui/core/InputAdornment';
import CloseIcon from '@material-ui/icons/Close';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import List from '@material-ui/core/List';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ArrowBack from '@material-ui/icons/ArrowBack';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import scheme from '../../scheme';
import { competenciesTypeMap, lessonTypes } from '../../store/common';
import styles from './disciplines.scss';


type Props = {};

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
	PaperProps: {
		style: {
			maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
			width: 250,
		},
	},
};

const errorsTexts = {
	required: 'Заполните обязательное поле',
};

const examTypes = [
	'credit',
	'credit_with_mark',
	'exam',
];

export default class DisciplinesListPage extends Component<Props> {
	props: Props;
	handleChange = name => event => {
		this.setState({
			formdata: {
				...this.state.formdata,
				[ name ]: event.target.value,
			},
		});
	};

	handleChangeCb = cb => event => {
		const { formdata } = this.state;
		let value = event.target.value;
		if (event.target.type === 'checkbox') {
			value = event.target.checked;
		}
		const changed = cb(formdata, value);
		this.setState({
			formdata: {
				...changed,
			},
		});
	};

	handleCheck = name => event => {
		this.setState({
			formdata: {
				...this.state.formdata,
				[ name ]: event.target.checked,
			},
		});
	};

	constructor (props) {
		super(props);

		let mode = 'new';
		const { disc_id, dir_id } = this.props.match.params;

		if (disc_id && dir_id) {
			mode = 'edit';
		}

		this.state = {
			loading: mode === 'edit',
			discipline: null,
			formdata: {
				direction_id: dir_id,
				competencies: [],
				constraints: {
					semesters: [],
				},
			},
			errors: {},
			mode,
			id: disc_id,
			direction_id: dir_id,
			disabled: false,
			all_competencies: [],
		};

		this.onSubmit = this.onSubmit.bind(this);
	}

	async loadData (_id) {
		let { discipline, mode, formdata, direction_id } = this.state;
		if (mode === 'edit') {
			const disciplines = await promiseIpc.send('query-disciplines', { _id });

			if (!disciplines && disciplines.length) {
				throw new Error('disciplines.length === 0');
			}

			discipline = disciplines[ 0 ];
		}

		const all_competencies = await promiseIpc.send('query-competencies', { direction_id });
		discipline = discipline || formdata;
		discipline.competencies = discipline.competencies || [];
		discipline.constraints = discipline.constraints || { semesters: [] };
		discipline.constraints.semesters = discipline.constraints.semesters.map(s => {
			if (typeof s.exam_time === 'number') {
				s.exam_time_raw = (s.exam_time / 9).toString();
				s.exam_time_enabled = true;
			} else {
				s.exam_time = s.exam_time_raw = null;
				s.exam_time_enabled = false;
			}

			return s;
		});

		this.setState({
			loading: false,
			formdata: discipline,
			all_competencies: all_competencies.reduce((all, curr) => {
				all[ curr._id ] = curr;
				return all;
			}, {}),
			discipline,
		});
	}

	componentDidMount () {
		const { id } = this.state;
		this.loadData(id)
			.catch(console.error);
	}

	validate () {
		const { formdata, id, direction_id } = this.state;
		const errors = {};
		const data = {};
		let invalid = false;

		scheme.disciplines.fields.forEach(({ name, description, type, optional, uniq }) => {
			let value = formdata[ name ];

			if (typeof value === 'string') {
				value = value.trim();
			}

			if (type === 'number') {
				value = parseFloat(value) || 0;
			}

			if (type === 'boolean') {
				data[ name ] = !!value;
				return;
			}

			if (!optional && !value) {
				errors[ name ] = 'required';
				invalid = true;
			}

			data[ name ] = value;
		});

		if (id) {
			data._id = id;
		}

		if (direction_id) {
			data.direction_id = direction_id;
		}

		data.constraints = formdata.constraints;
		data.constraints.semesters = data.constraints.semesters.map(s => {
			if (s.exam_time_enabled) {
				s.exam_time = parseInt(s.exam_time_raw, 10);
			} else {
				s.exam_time = null;
			}

			delete s.exam_time_enabled;
			delete s.exam_time_raw;

			s.time = parseFloat(s.time);
			s.self_time = parseInt(s.self_time, 10) | 0;
			s.teacher_time = parseInt(s.teacher_time, 10) | 0;

			return s;
		});

		return { errors, data, invalid };
	}

	async onSubmit (evt) {
		evt.preventDefault();

		const { errors, data, invalid } = this.validate();
		console.log({ errors, data, invalid });
		if (invalid) {
			this.setState({ errors });
			return;
		}

		this.setState({ errors: {}, disabled: true });

		const saveResult = await promiseIpc.send('save-discipline', data);
		console.log('saved', { saveResult });

		if (data._id) {
			this.props.history.push(`/directions/${data.direction_id}/disciplines/${data._id}`);
			return;
		}
		this.props.history.push(`/directions/${data.direction_id}`);
	}

	getBar () {
		const { mode, direction_id, id } = this.state;
		let header = '';
		switch (true) {
			case mode === 'new':
				header = <React.Fragment>Дисциплина &mdash; добавление</React.Fragment>;
				break;
			case mode === 'edit':
				header = <React.Fragment>Дисциплина &mdash; редактирование</React.Fragment>;
				break;
		}

		return (
			<AppBar position="static">
				<Toolbar>
					<Typography variant="title" color="inherit">
						<IconButton onClick={() => {
							if (id) {
								this.props.history.push(`/directions/${direction_id}/disciplines/${id}`);
								return;
							}
							this.props.history.push(`/directions/${direction_id}`);
						}}>
							<ArrowBack/>
						</IconButton>
						{header}
					</Typography>
				</Toolbar>
			</AppBar>
		);
	}

	fields () {
		const { formdata, errors, disabled, all_competencies } = this.state;

		return scheme.disciplines.fields.map(({ name, description, type, helperText }) => {
				const error = errors[ name ];

				if (type === 'competencies') {
					return null;
				}

				if (type === 'foreign') {
					const renderValue = selected => selected
						.map(value => all_competencies[ value ].code)
						.join(', ');
					return (
						<FormControl key={name} fullWidth>
							<InputLabel htmlFor="select-multiple-checkbox">{description}</InputLabel>
							<Select
								multiple
								value={formdata[ name ] || []}
								onChange={this.handleChange(name)}
								input={<Input id="select-multiple-checkbox"/>}
								renderValue={renderValue}
								MenuProps={MenuProps}
							>
								{Object.keys(all_competencies).map(competency_id => (
									<MenuItem key={competency_id} value={competency_id}>
										<Checkbox checked={formdata[ name ].indexOf(competency_id) > -1}/>
										<ListItemText primary={all_competencies[ competency_id ].code}/>
									</MenuItem>
								))}
							</Select>
						</FormControl>
					);
				}

				if (type === 'boolean') {
					return (
						<FormControlLabel
							id={name}
							key={name}
							control={
								<Switch
									checked={!!formdata[ name ]}
									onChange={this.handleCheck(name)}
									value={name}
								/>
							}
							label={description}
						/>
					);
				}

				if (type === 'part_type') {
					return (
						<FormControl fullWidth key={name}>
							<InputLabel htmlFor={type}>{description}</InputLabel>
							<Select
								id={type}
								value={formdata[ name ] || 'basic'}
								onChange={this.handleChangeCb((initial, value) => {
									initial[ name ] = value || 'basic';
									return initial;
								})}
								input={<Input name={type} id={type}/>}
							>
								<MenuItem value="basic">Базовая часть</MenuItem>
								<MenuItem value="variative">Вариативная часть</MenuItem>
								<MenuItem value="practice">Практика</MenuItem>
								<MenuItem value="gia">ГИА</MenuItem>
							</Select>
							<FormHelperText>Выберите тип дисциплины</FormHelperText>
						</FormControl>
					);
				}


				return (
					<TextField
						type={type}
						error={!!error}
						disabled={!!disabled}
						helperText={errorsTexts[ error ] || helperText}
						id={name}
						key={name}
						label={description}
						InputLabelProps={{
							shrink: true,
						}}
						value={formdata[ name ]}
						fullWidth
						margin="normal"
						onChange={this.handleChange(name)}
					/>
				);
			},
		);
	}

	addConstraintsSemester () {
		const { formdata } = this.state;
		formdata.constraints.semesters.push({
			number: 1,
			exam: null,
			teacher_time: 0,
			self_time: 0,
			time: 0,
		});

		let first = formdata.constraints.semesters[ 0 ].number;
		formdata.constraints.semesters = formdata.constraints.semesters.map(s => {
			s.number = first++;
			return s;
		});

		this.setState({
			formdata: {
				...formdata,
			},
		});
	}

	removeConstraintsSemester (number) {
		const { formdata } = this.state;
		formdata.constraints.semesters = formdata.constraints.semesters.filter(s => s.number !== number);

		this.setState({
			formdata: {
				...formdata,
			},
		});
	}


	semestersConstraints () {
		const { disabled, formdata } = this.state;
		return (
			<div>
				<Typography variant="title" color="textSecondary">
					Семестры изучения дисциплины
					<Typography
						variant="button"
						component="a"
						classes={{ root: styles.addLinkButton }}
						onClick={() => this.addConstraintsSemester()}
					>Добавить</Typography>
				</Typography>

				<List>
					{
						formdata.constraints.semesters.map(({ number, exam, teacher_time, self_time, time, exam_time, exam_time_raw, exam_time_enabled }, pos) => {
							const id = `constraints_semester_${pos}`;
							const number_id = `constraints_semester_${pos}_number`;
							const exam_id = `constraints_semester_${pos}_exam`;
							const time_id = `constraints_semester_${pos}_time`;
							const teacher_time_id = `constraints_semester_${pos}_teacher_time`;
							const self_time_id = `constraints_semester_${pos}_self_time`;
							const exam_time_id = `constraints_semester_${pos}_exam_time`;
							const exam_time_enabled_id = `constraints_semester_${pos}_exam_time_enabled`;

							let timeError = '';
							if (parseInt(teacher_time) + parseInt(self_time) !== parseInt(time) * 36) {
								timeError = 'Сумма времени работы с преподавателем и времени самостоятельной работы не совпадает с общей продолжительностью семестра. ';
							}

							let exam_time_helper = '';
							let exam_time_error = '';
							if (exam_time_enabled) {
								let intValue = parseInt(exam_time_raw, 10);
								if (intValue.toString(10) !== exam_time_raw.trim() || intValue <= 0) {
									exam_time_error = 'Введите натуральное число';
								} else {
									exam_time_helper = `${intValue} дней или ${intValue * 9} часов, из которых 9 часов - работа с преподавателем, ${intValue * 9 - 9} часов - самостоятельная работа`;
								}
							}


							return (
								<div id={id} key={id}>
									<Typography variant="subheading" color="textSecondary">
										Семестр {number}
										<Typography
											variant="button"
											component="a"
											classes={{ root: styles.addLinkButton }}
											onClick={() => this.removeConstraintsSemester(number)}
										>Удалить</Typography>
										<Paper className={styles.lessonPaper}>
											<Grid container spacing={8}>
												{pos === 0 && <Grid item xs={12}>
													<TextField
														fullWidth
														id={number_id}
														type="number"
														label="Номер семестра"
														value={number}
														onChange={this.handleChangeCb((initial, value) => {
															let v = parseInt(value, 10);
															initial.constraints.semesters = initial.constraints.semesters.map(s => {
																s.number = v++;
																return s;
															});

															return initial;
														})}
														margin="dense"
													/>
												</Grid>}
												<Grid item xs={6}>
													<FormControl fullWidth margin="dense">
														<InputLabel htmlFor={exam_id}>Зачёт / экзамен</InputLabel>
														<Select
															value={exam === null ? 'null' : exam}
															onChange={this.handleChangeCb((initial, value) => {
																initial.constraints.semesters = initial.constraints.semesters.map(s => {
																	if (s.number === number) {
																		s.exam = value === 'null' ? null : value;
																	}
																	return s;
																});

																return initial;
															})}
															input={<Input name={exam_id} id={exam_id}/>}
														>
															<MenuItem key={'null'} value={'null'}>
																<em>Нет</em>
															</MenuItem>
															{examTypes.map(t => {
																return (
																	<MenuItem
																		key={t}
																		value={t}
																	>{lessonTypes[ t ].full}</MenuItem>
																);
															})}
														</Select>
													</FormControl>
												</Grid>
												<Grid item xs={6}>
													<TextField
														fullWidth
														id={time_id}
														type="number"
														label="Продолжительность семестра (в зач. ед.)"
														value={time}
														onChange={this.handleChangeCb((initial, value) => {
															initial.constraints.semesters = initial.constraints.semesters.map(s => {
																if (s.number === number) {
																	s.time = parseFloat(value);
																}
																return s;
															});

															return initial;
														})}
														margin="dense"
													/>
												</Grid>
												{exam && <React.Fragment>
													<Grid item xs={6}>
														<FormControlLabel
															fullWidth
															id={exam_time_enabled_id}
															control={
																<Switch
																	fullWidth
																	checked={!!exam_time_enabled}
																	onChange={this.handleChangeCb((initial, value) => {
																		initial.constraints.semesters = initial.constraints.semesters.map(s => {
																			if (s.number === number) {
																				s.exam_time_enabled = value;
																				if (value) {
																					s.exam_time = s.exam_time || 0;
																					s.exam_time_raw = s.exam_time_raw || '';
																				} else {
																					s.exam_time = null;
																					s.exam_time_raw = '';
																				}
																			}
																			return s;
																		});

																		return initial;
																	})}
																	value={'exam_time_enabled'}
																/>
															}
															label="Выделить время на сдачу экзаменов / зачётов"
														/>
													</Grid>
													<Grid item xs={6}>
														<TextField
															fullWidth
															disabled={!exam_time_enabled}
															error={!!exam_time_error}
															id={exam_time_id}
															type="number"
															label="Количество дней на сдачу экзамена / зачёта"
															value={exam_time_raw}
															onChange={this.handleChangeCb((initial, value) => {
																initial.constraints.semesters = initial.constraints.semesters.map(s => {
																	if (s.number === number) {
																		s.exam_time_raw = value;
																	}
																	return s;
																});

																return initial;
															})}
															margin="dense"
															helperText={exam_time_error || exam_time_helper}
														/>
													</Grid>
												</React.Fragment>}
												<Grid item xs={6}>
													<TextField
														fullWidth
														id={teacher_time_id}
														error={!!timeError}
														type="number"
														label="Время, отведённое на работу с преподавателем (часы)"
														value={teacher_time}
														onChange={this.handleChangeCb((initial, value) => {
															initial.constraints.semesters = initial.constraints.semesters.map(s => {
																if (s.number === number) {
																	s.teacher_time = value;
																}
																return s;
															});

															return initial;
														})}
														margin="dense"
														helperText={timeError + `Рекомендуемое значение: ${time * 36} * 0.66 = ${(time * 36 * 2 / 3) | 0}`}
													/>
												</Grid>
												<Grid item xs={6}>
													<TextField
														fullWidth
														id={self_time_id}
														error={!!timeError}
														type="number"
														label="Время, отведённое на самостоятельную работу (часы)"
														value={self_time}
														onChange={this.handleChangeCb((initial, value) => {
															initial.constraints.semesters = initial.constraints.semesters.map(s => {
																if (s.number === number) {
																	s.self_time = value;
																}
																return s;
															});

															return initial;
														})}
														margin="dense"
														helperText={timeError + `Рекомендуемое значение: ${time * 36} * 0.33 = ${(time * 36 / 3) | 0}`}
													/>
												</Grid>
											</Grid>
										</Paper>
									</Typography>
								</div>
							);
						})
					}
				</List>

			</div>
		);
	}

	addCompetency () {
		const { formdata, all_competencies } = this.state;
		const has = formdata.competencies.map(c => c._id);
		const possible = Object.keys(all_competencies).find(cid => !has.includes(cid));
		if (possible) {
			formdata.competencies.push({
				_id: possible,
				know: [],
				able_to: [],
				own: [],
			});

			this.setState({
				formdata: {
					...formdata,
				},
			});
		}
	}

	removeCompetency (_id) {
		const { formdata } = this.state;
		formdata.competencies = formdata.competencies.filter(c => c._id !== _id);
		this.setState({
			formdata: {
				...formdata,
			},
		});
	}

	competenciesSelect () {
		const { formdata, all_competencies } = this.state;

		const has = formdata.competencies.map(c => c._id);
		const possible = Object.keys(all_competencies).filter(cid => !has.includes(cid));
		const disabled = possible.length === 0;

		return (
			<div>
				<Typography variant="title" color="textSecondary">
					Изучаемые компетенции
					{!disabled && <Typography
						variant="button"
						component="a"
						classes={{ root: styles.addLinkButton }}
						onClick={() => this.addCompetency()}
					>Добавить</Typography>}
				</Typography>

				<List>
					{
						formdata.competencies.map((competency, pos) => {
							const { _id } = competency;
							const id = `competency_${pos}`;
							const id_id = `${pos}_id`;

							return (
								<div id={id} key={id}>
									<Typography variant="subheading" color="textSecondary">
										Компетенция {all_competencies[ _id ].code}
										<Typography
											variant="button"
											component="a"
											classes={{ root: styles.addLinkButton }}
											onClick={() => this.removeCompetency(_id)}
										>Удалить</Typography>
										<Paper className={styles.lessonPaper}>
											<Grid container spacing={8}>
												<Grid item xs={4}>
													<FormControl fullWidth margin="dense">
														<InputLabel htmlFor={id_id}>Код компетенции</InputLabel>
														<Select
															value={_id}
															onChange={this.handleChangeCb((initial, value) => {
																initial.competencies = initial.competencies.map(c => {
																	if (c._id === _id) {
																		c._id = value;
																	}
																	return c;
																});

																return initial;
															})}
															input={<Input name={_id} id={_id}/>}
														>
															<MenuItem
																key={_id}
																value={_id}
															>{all_competencies[ _id ].code}</MenuItem>
															{possible.map(cid => {
																return (
																	<MenuItem
																		key={cid}
																		value={cid}
																	>{all_competencies[ cid ].code}</MenuItem>
																);
															})}
														</Select>
													</FormControl>
												</Grid>
												<Grid item xs={8}>&nbsp;</Grid>
												<Grid item xs={12}>
													{this.editCompetenciesSkillsList('know', competency)}
													{this.editCompetenciesSkillsList('able_to', competency)}
													{this.editCompetenciesSkillsList('own', competency)}
												</Grid>
											</Grid>
										</Paper>
									</Typography>
								</div>
							);
						})
					}
				</List>

			</div>
		);
	}

	addCompetencySkill (_id, type) {
		const { formdata } = this.state;
		formdata.competencies = formdata.competencies.map((c) => {
			if (c._id === _id) {
				c[ type ].push('');
			}

			return c;
		});

		this.setState({
			formdata: Object.assign({}, formdata),
		});
	}

	removeCompetencySkill (_id, type, pos) {
		const { formdata } = this.state;
		formdata.competencies = formdata.competencies.map((c) => {
			if (c._id === _id) {
				c[ type ].splice(pos, 1);
			}

			return c;
		});

		this.setState({
			formdata: Object.assign({}, formdata),
		});
	}

	editCompetenciesSkillsList (type, competency) {
		return (
			<React.Fragment>
				<Typography variant="body2">
					{competenciesTypeMap[ type ]}
					<Typography
						variant="button"
						component="a"
						classes={{ root: styles.addLinkButton }}
						onClick={() => this.addCompetencySkill(competency._id, type)}
					>Добавить элемент
					</Typography>
				</Typography>
				{
					competency[ type ].map((item, pos) => {
						const id = `${competency._id}_${type}_${pos}`;

						return (
							<Input
								id={id}
								key={id}
								value={item}
								onChange={this.handleChangeCb((initial, value) => {
									const _c = initial.competencies.find(c => c._id === competency._id);
									_c[ type ][ pos ] = value;
									return initial;
								})}
								fullWidth
								endAdornment={
									<InputAdornment position="end">
										<IconButton
											onClick={() => this.removeCompetencySkill(competency._id, type, pos)}
										>
											<CloseIcon/>
										</IconButton>
									</InputAdornment>
								}
							/>
						);
					})
				}
			</React.Fragment>
		);
	}


	getContent () {
		const { disabled, formdata } = this.state;
		console.log('formdata = ', formdata);

		return (
			<div className={[ styles.contentWrapper, styles.contentWrapperMargin ].join(' ')}>
				<Paper classes={{ root: styles.content }}>
					<form onSubmit={this.onSubmit}>
						<Typography variant="headline">Заполните данные формы</Typography>
						{this.fields()}
						<hr/>
						{this.semestersConstraints()}

						<hr/>
						{this.competenciesSelect()}

						<br/>

						<Button variant="contained" color="primary" type="submit" disabled={!!disabled}>
							Сохранить
						</Button>
					</form>
				</Paper>
			</div>
		);
	}

	getColumns () {
		return scheme.disciplines.fields.map(({ name, description }) => ({
			Header: description,
			accessor: name,
		}));
	}

	render () {
		const { loading } = this.state;
		if (loading) {
			return (
				<div>
					{this.getBar()}
					<div className={styles.progressWrapper}>
						<div className={styles.progress}>
							<CircularProgress color="white"/>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div>
				{this.getBar()}
				{this.getContent()}
			</div>
		);
	}
}
