import CssBaseline from '@material-ui/core/CssBaseline';
import React from 'react';
import { Route, Switch } from 'react-router';
import CompetenciesEditPage from './components/competencies/EditPage';
import DirectionsEditPage from './components/directions/EditPage';
import DirectionsListPage from './components/directions/ListPage';
import DirectionsViewPage from './components/directions/ViewPage';
import DisciplinesEditPage from './components/disciplines/EditPage';
import DisciplinesViewPage from './components/disciplines/ViewPage';
import SpecialtiesEditPage from './components/specialties/EditPage';
import SpecialtiesViewPage from './components/specialties/ViewPage';
import App from './containers/App';
import HomePage from './containers/HomePage';


export default () => (
	<App>
		<CssBaseline/>
		<Switch>
			<Route exact path="/directions"
			       component={DirectionsListPage}/> {/* список всех направлений подготовки */}

			<Route exact path="/directions/add"
			       component={DirectionsEditPage}/> {/* добавление информации о новом направлении подготовки */}

			<Route path="/directions/:dir_id/edit"
			       component={DirectionsEditPage}/> {/* редактирование информации о направлении подготовки */}

			<Route path="/directions/:dir_id/competencies/add"
			       component={CompetenciesEditPage}/> {/* добавление новой компетенции */}

			<Route path="/directions/:dir_id/competencies/:comp_id/edit"
			       component={CompetenciesEditPage}/> {/* редактирование имеющейся компетенции */}

			<Route path="/directions/:dir_id/specialties/add"
			       component={SpecialtiesEditPage}/> {/* добавление новой специальности */}

			<Route path="/directions/:dir_id/specialties/:spec_id/edit"
			       component={SpecialtiesEditPage}/> {/* редактирование имеющейся специальности */}

			<Route path="/directions/:dir_id/specialties/:spec_id"
			       component={SpecialtiesViewPage}/> {/* просомтр имеющейся специальности */}

			<Route path="/directions/:dir_id/disciplines/add"
			       component={DisciplinesEditPage}/> {/* добавление информации о новой дисциплине */}

			<Route path="/directions/:dir_id/disciplines/:disc_id/edit"
			       component={DisciplinesEditPage}/> {/* редактирование информации о дисциплине */}

			<Route path="/directions/:dir_id/disciplines/:disc_id"
			       component={DisciplinesViewPage}/> {/* просмотр имеющейся дисциплины */}

			<Route path="/directions/:dir_id"
			       component={DirectionsViewPage}/> {/* просмотр информации о направлении подготовки */}


			<Route exact path="/disciplines" component={HomePage}/>
			<Route exact path="/" component={HomePage}/>
			<Route component={HomePage}/>
		</Switch>
	</App>
)
