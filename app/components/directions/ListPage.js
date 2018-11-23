import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import AddIcon from '@material-ui/icons/Add';
import ArrowBack from '@material-ui/icons/ArrowBack';
import EditIcon from '@material-ui/icons/Edit';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import ReactTable from 'react-table';
import scheme from '../../scheme';
import styles from './directions.scss';


export default class DirectionsListPage extends Component {
	constructor (props) {
		super(props);

		this.state = {
			loading: true,
			directions: [],
		};

		this.onAdd = this.onAdd.bind(this);
		this.onEdit = this.onEdit.bind(this);
	}

	async loadData () {
		const directions = await promiseIpc.send('query-directions');
		this.setState({
			loading: false,
			directions,
		});
	}

	componentDidMount () {
		this.loadData()
			.catch(console.error);
	}

	onAdd () {
		this.props.history.push('/directions/add');
	}

	onEdit (id) {
		this.props.history.push(`/directions/${id}/edit`);
	}

	getBar () {
		return (
			<AppBar position="static">
				<Toolbar>
					<IconButton onClick={() => this.props.history.push('/')}>
						<ArrowBack/>
					</IconButton>

					<Typography variant="title" color="inherit">
						Формируемые направления подготовки
					</Typography>

					<Button onClick={this.onAdd} mini variant="fab" color="white" classes={{ fab: styles.add }}>
						<AddIcon/>
					</Button>
				</Toolbar>
			</AppBar>
		);
	}

	getContent () {
		const { directions } = this.state;
		const { history } = this.props;

		return (
			<div className={styles.contentWrapper}>
				<ReactTable
					data={directions}
					columns={this.getColumns()}
					defaultPageSize={12}
					className="-highlight"
					getTrProps={(state, rowInfo, column, instance) => {
						if (!rowInfo) {
							return {};
						}

						const { _id } = rowInfo.original;
						return {
							onClick () {
								history.push(`/directions/${_id}`);
							},

							style: {
								cursor: 'pointer',
							},
						};
					}}
				/>
			</div>
		);
	}

	getColumns () {
		const columns = scheme.directions.fields.map(({ name, description }) => ({
			Header: description,
			accessor: name,
		}));

		return columns;
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
