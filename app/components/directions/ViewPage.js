import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import AddIcon from '@material-ui/icons/Add';
import ArrowBack from '@material-ui/icons/ArrowBack';
import EditIcon from '@material-ui/icons/Edit';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import ReactTable from 'react-table';
import scheme from '../../scheme';
import { partTypeMap } from '../../store/common';
import styles from './directions.scss';


export default class DirectionsViewPage extends Component<Props> {
	constructor (props) {
		super(props);

		const { dir_id } = this.props.match.params;

		this.state = {
			id: dir_id,
			direction: null,
			competencies: [],
			specialties: [],
		};

		this.onEdit = this.onEdit.bind(this);
	}

	componentDidMount () {
		this.loadData()
			.catch(console.error);
	}

	async loadData () {
		const { id } = this.state;
		const [ direction ] = await promiseIpc.send('query-directions', { _id: id });
		const competencies = await promiseIpc.send('query-competencies', { direction_id: id });
		const disciplines = await promiseIpc.send('query-disciplines', { direction_id: id });
		const specialties = await promiseIpc.send('query-specialties', { direction_id: id });
		this.setState({
			direction,
			competencies,
			specialties,
			disciplines,
		});
	}

	onEdit (id) {
		this.props.history.push(`/directions/${id}/edit`);
	}

	getBar () {
		const { direction, id } = this.state;
		let header = null;
		if (direction) {
			header = <React.Fragment>{direction.name}</React.Fragment>;
		} else {
			header = <React.Fragment>Направление подготовки</React.Fragment>;
		}

		return (
			<AppBar position="static">
				<Toolbar>
					<IconButton onClick={() => this.props.history.push('/directions')}>
						<ArrowBack/>
					</IconButton>

					<Typography variant="title" color="inherit">
						{header}
					</Typography>

					<Button onClick={() => this.onEdit(id)} mini variant="fab" color="white"
					        classes={{ fab: styles.add }}>
						<EditIcon/>
					</Button>
				</Toolbar>
			</AppBar>
		);
	}

	getColumns (table) {
		const { id } = this.state;

		const columns = scheme[ table ].fields
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

				return {
					Header: description,
					id: name,
					accessor,
				};
			})
			.filter(col => col);

		return columns;
	}

	content () {
		const { direction, competencies, specialties, disciplines, id } = this.state;
		const { history } = this.props;
		if (!direction) {
			return null;
		}

		return (
			<div className={[ styles.contentWrapper, styles.contentWrapperMargin ].join(' ')}>
				<Paper classes={{ root: styles.content }}>
					{
						scheme.directions.fields.map(function({ name, description }) {
							return (
								<div key={name}>
									<Typography color="inherit" variant="body2">{description}</Typography>
									<Typography color="inherit" variant="body1">{direction[ name ]}</Typography>
								</div>
							);
						})
					}

				</Paper>

				<Paper classes={{ root: styles.content }}>
					<ReactTable
						data={competencies}
						columns={this.getColumns('competencies')}
						defaultPageSize={10}
						className="-highlight"
						getTrProps={(state, rowInfo, column, instance) => {
							if (!rowInfo) {
								return {};
							}

							const { _id } = rowInfo.original;
							return {
								onClick () {
									history.push(`/directions/${id}/competencies/${_id}/edit`);
								},

								style: {
									cursor: 'pointer',
								},
							};
						}}
					/>

					<Button variant="contained" color="primary"
					        onClick={() => this.props.history.push(`/directions/${id}/competencies/add`)}>
						Добавить
						<AddIcon/>
					</Button>
				</Paper>

				<Paper classes={{ root: styles.content }}>
					<ReactTable
						data={specialties}
						columns={this.getColumns('specialties')}
						defaultPageSize={5}
						className="-highlight"
						getTrProps={(state, rowInfo, column, instance) => {
							if (!rowInfo) {
								return {};
							}

							const { _id } = rowInfo.original;
							return {
								onClick () {
									history.push(`/directions/${id}/specialties/${_id}`);
								},

								style: {
									cursor: 'pointer',
								},
							};
						}}
					/>

					<Button variant="contained" color="primary"
					        onClick={() => this.props.history.push(`/directions/${id}/specialties/add`)}>
						Добавить
						<AddIcon/>
					</Button>
				</Paper>

				<Paper classes={{ root: styles.content }}>
					<ReactTable
						data={disciplines}
						columns={this.getColumns('disciplines')}
						defaultPageSize={10}
						className="-highlight"
						getTrProps={(state, rowInfo, column, instance) => {
							if (!rowInfo) {
								return {};
							}

							const { _id } = rowInfo.original;
							return {
								onClick () {
									history.push(`/directions/${id}/disciplines/${_id}`);
								},

								style: {
									cursor: 'pointer',
								},
							};
						}}
					/>

					<Button variant="contained" color="primary"
					        onClick={() => this.props.history.push(`/directions/${id}/disciplines/add`)}>
						Добавить
						<AddIcon/>
					</Button>
				</Paper>
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
